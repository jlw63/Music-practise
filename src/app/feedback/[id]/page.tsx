"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { timeAgo } from "@/lib/timeAgo";

type FeedbackPost = {
  id: string;
  title: string;
  content: string;
  type: string;
  video_url?: string;
  created_at: string;
  author_id: string;
  is_anonymous?: boolean;
  genre?: string | null;
  instruments?: string[] | null;
  status?: "wip" | "finished" | null;
  profiles?: { username: string };
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  parent_id: string | null;
  profiles?: { username: string };
};

type CommentLikeState = { count: number; liked: boolean };

type CategoryStat = { avg: number | null; count: number };
type RatingStats = Record<"overall" | "accuracy" | "dynamics" | "interpretation" | "technique", CategoryStat>;

const EMPTY_RATING_STATS: RatingStats = {
  overall: { avg: null, count: 0 },
  accuracy: { avg: null, count: 0 },
  dynamics: { avg: null, count: 0 },
  interpretation: { avg: null, count: 0 },
  technique: { avg: null, count: 0 },
};

const RATING_CATEGORIES = [
  { key: "overall", label: "Overall", hint: "Your overall impression", required: true },
  { key: "accuracy", label: "Accuracy", hint: "Correct notes & rhythm" },
  { key: "dynamics", label: "Dynamics", hint: "Volume contrast & expression" },
  { key: "interpretation", label: "Interpretation", hint: "Musicality & personal voice" },
  { key: "technique", label: "Technique", hint: "Control, tone & fluency" },
] as const;

type Ratings = {
  overall: number | null;
  accuracy: number | null;
  dynamics: number | null;
  interpretation: number | null;
  technique: number | null;
};

const EMPTY_RATINGS: Ratings = {
  overall: null,
  accuracy: null,
  dynamics: null,
  interpretation: null,
  technique: null,
};

export default function FeedbackDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const postId = params?.id as string;

  const [post, setPost] = useState<FeedbackPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLikes, setCommentLikes] = useState<Record<string, CommentLikeState>>({});
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [ratingStats, setRatingStats] = useState<RatingStats>(EMPTY_RATING_STATS);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  // scores start empty on purpose — pre-filled scores invite lazy straight-10s.
  // Populated from the server (per-user) once fetchOwnRating resolves below —
  // never from localStorage, which has no per-user scope and would leak one
  // user's ratings to the next person on the same browser.
  const [ratings, setRatings] = useState<Ratings>(EMPTY_RATINGS);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingRating, setHasExistingRating] = useState(false);
  const prefillDone = useRef(false);

  // current playback time of the YouTube embed, streamed via the iframe API
  const videoRef = useRef<HTMLIFrameElement | null>(null);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "infoDelivery" && data.info?.currentTime != null) {
          currentTimeRef.current = data.info.currentTime;
        }
      } catch {
        // not a YouTube API message
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function startVideoListening() {
    videoRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
      "*"
    );
  }

  async function fetchCommentLikes(commentIds: string[]) {
    if (commentIds.length === 0) {
      setCommentLikes({});
      return;
    }

    const { data } = await supabase
      .from("comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", commentIds);

    const next: Record<string, CommentLikeState> = {};
    commentIds.forEach((id) => {
      next[id] = { count: 0, liked: false };
    });
    data?.forEach((row) => {
      const stat = next[row.comment_id];
      if (!stat) return;
      stat.count += 1;
      if (user && row.user_id === user.id) stat.liked = true;
    });
    setCommentLikes(next);
  }

  async function fetchRatingStats() {
    const { data, error } = await supabase
      .from("feedback_ratings")
      .select("rating, accuracy, dynamics, interpretation, technique")
      .eq("post_id", postId);

    if (error) {
      console.error("Could not load rating stats:", error);
    }

    if (!data || data.length === 0) {
      setRatingStats(EMPTY_RATING_STATS);
      return;
    }

    function statFor(values: (number | null)[]): CategoryStat {
      const present = values.filter((v): v is number => v !== null);
      if (present.length === 0) return { avg: null, count: 0 };
      return { avg: present.reduce((sum, v) => sum + v, 0) / present.length, count: present.length };
    }

    setRatingStats({
      overall: statFor(data.map((r) => r.rating)),
      accuracy: statFor(data.map((r) => r.accuracy)),
      dynamics: statFor(data.map((r) => r.dynamics)),
      interpretation: statFor(data.map((r) => r.interpretation)),
      technique: statFor(data.map((r) => r.technique)),
    });
  }

  useEffect(() => {
    if (!postId) return;

    async function fetchPost() {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          type,
          video_url,
          created_at,
          author_id,
          genre,
          instruments,
          status,
          profiles!posts_author_id_fkey(username)
        `)
        .eq("id", postId)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPost(data as unknown as FeedbackPost);
      setLoading(false);
    }

    async function fetchComments() {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          author_id,
          parent_id,
          profiles!comments_author_id_fkey(username)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (!error) {
        const rows = (data ?? []) as unknown as Comment[];
        setComments(rows);
        fetchCommentLikes(rows.map((c) => c.id));
      }
    }

    fetchPost();
    fetchComments();
    fetchRatingStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // pull the reviewer's own previously-submitted rating from the server so
  // resubmitting edits it in place instead of masquerading as a fresh rating
  useEffect(() => {
    if (!postId || !user) return;

    async function fetchOwnRating() {
      const { data } = await supabase
        .from("feedback_ratings")
        .select("rating, accuracy, dynamics, interpretation, technique")
        .eq("post_id", postId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (data) {
        const next: Ratings = {
          overall: data.rating,
          accuracy: data.accuracy,
          dynamics: data.dynamics,
          interpretation: data.interpretation,
          technique: data.technique,
        };
        setRatings(next);
        setHasExistingRating(true);
      }
    }

    fetchOwnRating();
  }, [postId, user]);

  // prefill the written-feedback box with the reviewer's own existing top-level
  // comment (once) so re-submitting edits it instead of adding a duplicate
  useEffect(() => {
    if (prefillDone.current || !user) return;
    const own = comments.find((c) => c.author_id === user.id && !c.parent_id);
    if (own) {
      setCommentText(own.content);
      prefillDone.current = true;
    }
  }, [comments, user]);

  function handleRatingChange(category: keyof Ratings, nextRating: number) {
    setRatings((prev) => ({ ...prev, [category]: nextRating }));
  }

  function insertTimestamp() {
    const secs = Math.floor(currentTimeRef.current);
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    const stamp = `@${m}:${s}`;
    setCommentText((prev) => (prev ? `${prev.trimEnd()} ${stamp} ` : `${stamp} `));
  }

  async function handleSubmitFeedback() {
    if (!user || !post || ratings.overall === null) return;

    setSubmitting(true);

    const { error: ratingError } = await supabase.from("feedback_ratings").upsert(
      {
        post_id: postId,
        user_id: user.id,
        rating: ratings.overall,
        accuracy: ratings.accuracy,
        dynamics: ratings.dynamics,
        interpretation: ratings.interpretation,
        technique: ratings.technique,
      },
      { onConflict: "post_id,user_id" }
    );

    if (ratingError) {
      console.log("Rating save skipped:", ratingError);
    } else {
      setHasExistingRating(true);
      fetchRatingStats();
    }

    if (commentText.trim()) {
      const ownComment = comments.find((c) => c.author_id === user.id && !c.parent_id);

      if (ownComment) {
        const { error: updateError } = await supabase
          .from("comments")
          .update({ content: commentText.trim() })
          .eq("id", ownComment.id);

        if (updateError) {
          toast("Could not update your feedback: " + updateError.message, "error");
          setSubmitting(false);
          return;
        }

        setComments((prev) =>
          prev.map((c) => (c.id === ownComment.id ? { ...c, content: commentText.trim() } : c))
        );
      } else {
        const { error: commentError } = await supabase.from("comments").insert({
          post_id: post.id,
          author_id: user.id,
          content: commentText.trim(),
        });

        if (commentError) {
          toast("Could not post your feedback: " + commentError.message, "error");
          setSubmitting(false);
          return;
        }

        const { data: latestComment } = await supabase
          .from("comments")
          .select(`
            id,
            content,
            created_at,
            author_id,
            parent_id,
            profiles!comments_author_id_fkey(username)
          `)
          .eq("post_id", post.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestComment) {
          const comment = latestComment as unknown as Comment;
          setComments((prev) => [...prev, comment]);
          setCommentLikes((prev) => ({ ...prev, [comment.id]: { count: 0, liked: false } }));
        }
      }
    }

    setSubmitting(false);
    toast(
      hasExistingRating ? "Feedback updated 🎵" : "Feedback submitted — thanks for helping them improve! 🎵",
      "success"
    );
  }

  async function handleReplySubmit(parentId: string) {
    if (!user || !post || !replyText.trim()) return;

    setSubmittingReply(true);

    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      author_id: user.id,
      content: replyText.trim(),
      parent_id: parentId,
    });

    if (error) {
      toast("Could not post your reply: " + error.message, "error");
      setSubmittingReply(false);
      return;
    }

    const { data: latestReply } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        author_id,
        parent_id,
        profiles!comments_author_id_fkey(username)
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestReply) {
      const reply = latestReply as unknown as Comment;
      setComments((prev) => [...prev, reply]);
      setCommentLikes((prev) => ({ ...prev, [reply.id]: { count: 0, liked: false } }));
    }

    setReplyText("");
    setReplyingTo(null);
    setSubmittingReply(false);
  }

  async function toggleCommentLike(commentId: string) {
    if (!user) {
      toast("Login to like comments", "info");
      return;
    }

    const current = commentLikes[commentId] ?? { count: 0, liked: false };

    if (current.liked) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: { count: current.count - 1, liked: false },
      }));
    } else {
      const { error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: user.id });

      if (error) {
        console.log("Comment like error:", error);
        return;
      }

      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: { count: current.count + 1, liked: true },
      }));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Loading feedback...</p>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Feedback not found.</p>
      </div>
    );
  }

  const username = post.profiles?.username;
  const ratedCount = Object.values(ratings).filter((v) => v !== null).length;

  // feedback comments are private: the post author sees everything,
  // a reviewer sees only their own thread (their comment + any reply to it)
  const isPostAuthor = user?.id === post.author_id;
  const commentsById = new Map(comments.map((c) => [c.id, c]));
  const visibleComments = isPostAuthor
    ? comments
    : comments.filter((c) => {
        if (c.author_id === user?.id) return true;
        const parent = c.parent_id ? commentsById.get(c.parent_id) : null;
        return parent?.author_id === user?.id;
      });
  const topLevelComments = visibleComments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, Comment[]>();
  visibleComments.forEach((c) => {
    if (!c.parent_id) return;
    const list = repliesByParent.get(c.parent_id) ?? [];
    list.push(c);
    repliesByParent.set(c.parent_id, list);
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const embedSrc = post.video_url
    ? post.video_url + (post.video_url.includes("?") ? "&" : "?") + "enablejsapi=1"
    : undefined;

  const cardClass =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm scroll-mt-32";

  const renderComment = (comment: Comment, isReply: boolean) => {
    const likeState = commentLikes[comment.id] ?? { count: 0, liked: false };
    const replies = repliesByParent.get(comment.id) ?? [];

    return (
      <div key={comment.id} className={isReply ? "mt-3 ml-6 border-l-2 border-[var(--border)] pl-3 py-1.5" : "border-l-2 border-[var(--border)] pl-3 py-1.5 transition-colors hover:border-blue-400/60"}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {comment.profiles?.username || "Anonymous"}
          </p>
          <span className="text-xs text-[var(--muted)]">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--foreground)]/90">{comment.content}</p>

        <div className="mt-1.5 flex items-center gap-3">
          <button
            onClick={() => toggleCommentLike(comment.id)}
            className={`flex items-center gap-1 text-xs font-medium transition ${
              likeState.liked
                ? "text-blue-600 dark:text-blue-400"
                : "text-[var(--muted)] hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <span className={likeState.liked ? "" : "opacity-70"}>
              {likeState.liked ? "♥" : "♡"}
            </span>
            {likeState.count > 0 ? likeState.count : ""}
          </button>
          {user && !isReply && (
            <button
              onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                setReplyText("");
              }}
              className="text-xs font-medium text-[var(--muted)] transition hover:text-blue-600 dark:hover:text-blue-400"
            >
              Reply
            </button>
          )}
        </div>

        {replyingTo === comment.id && (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReplySubmit(comment.id);
              }}
              placeholder="Write a reply..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              onClick={() => handleReplySubmit(comment.id)}
              disabled={submittingReply || !replyText.trim()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reply
            </button>
          </div>
        )}

        {replies.map((reply) => renderComment(reply, true))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <Link
        href="/feedback"
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:gap-1.5 dark:text-blue-400"
      >
        ← Back to feedback feed
      </Link>

      {/* Sticky section nav */}
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-2 py-1.5 shadow-sm">
        <button
          onClick={() => scrollTo("overview")}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </button>
        <button
          onClick={() => scrollTo("give-feedback")}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {isPostAuthor ? "Ratings" : "Give feedback"}
          {!isPostAuthor && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                ratings.overall !== null
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
              }`}
            >
              {ratedCount}/{RATING_CATEGORIES.length}
            </span>
          )}
        </button>
        <button
          onClick={() => scrollTo("comments")}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {isPostAuthor ? "Comments" : "Your comments"}
          <span className="rounded-full bg-[var(--border)]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {topLevelComments.length}
          </span>
        </button>
      </div>

      {/* Overview */}
      <div id="overview" className={cardClass}>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {post.title}
          </h1>
          <span className="whitespace-nowrap text-sm text-[var(--muted)]">
            by{" "}
            {username ? (
              <span className="font-medium text-[var(--foreground)]">{username}</span>
            ) : (
              <span className="italic">Anonymous</span>
            )}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]/90">
          {post.content}
        </p>

        {(post.genre || (post.instruments && post.instruments.length > 0) || post.status === "wip") && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.status === "wip" && (
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                WIP
              </span>
            )}
            {post.genre && (
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                {post.genre}
              </span>
            )}
            {post.instruments?.map((inst) => (
              <span
                key={inst}
                className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                {inst}
              </span>
            ))}
          </div>
        )}

        {embedSrc && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Video
            </h2>
            <div className="aspect-video overflow-hidden rounded-xl border border-[var(--border)]">
              <iframe
                ref={videoRef}
                src={embedSrc}
                title={post.title}
                className="h-full w-full"
                allowFullScreen
                onLoad={startVideoListening}
              />
            </div>
          </div>
        )}
      </div>

      {/* Ratings: authors see the aggregate, reviewers see the rating form */}
      {isPostAuthor ? (
        <div id="give-feedback" className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Ratings from reviewers</h2>
            {ratingStats.overall.count > 0 && (
              <span className="text-xs font-medium text-[var(--muted)]">
                {ratingStats.overall.count} rating{ratingStats.overall.count === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {ratingStats.overall.count === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No ratings yet — share your post to get some ears on it.
            </p>
          ) : (
            <div className="mt-1 divide-y divide-[var(--border)]">
              {RATING_CATEGORIES.map((category) => {
                const stat = ratingStats[category.key];
                return (
                  <div key={category.key} className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                          {category.label}
                        </h3>
                        <p className="text-xs text-[var(--muted)]">{category.hint}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          stat.avg !== null
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : "bg-[var(--border)]/30 text-[var(--muted)]"
                        }`}
                      >
                        {stat.avg !== null
                          ? `${stat.avg.toFixed(1)}/10 (${stat.count})`
                          : "No ratings"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <div
                          key={n}
                          className={`h-3 flex-1 rounded-full ${
                            stat.avg !== null && n <= Math.round(stat.avg)
                              ? "bg-blue-600"
                              : "bg-[var(--border)]/50"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div id="give-feedback" className={cardClass + " space-y-1"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Rate this performance</h2>
            <span className="text-xs font-medium text-[var(--muted)]">
              1 = needs improvement · 10 = basically perfect
            </span>
          </div>
          {hasExistingRating && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              You've already rated this — editing below updates your existing feedback.
            </p>
          )}

          {!user ? (
            <p className="pt-3 text-sm text-[var(--muted)]">Log in to give feedback.</p>
          ) : (
            <>
              <div className="divide-y divide-[var(--border)]">
                {RATING_CATEGORIES.map((category) => {
                  const value = ratings[category.key];
                  return (
                    <div key={category.key} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            {category.label}
                            {"required" in category && category.required && (
                              <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                required
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-[var(--muted)]">{category.hint}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            value !== null
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : "bg-[var(--border)]/30 text-[var(--muted)]"
                          }`}
                        >
                          {value !== null ? `${value}/10` : "—"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-1">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            type="button"
                            title={`${n}/10`}
                            aria-label={`${category.label}: ${n} out of 10`}
                            onClick={() => handleRatingChange(category.key, n)}
                            className={`h-3 flex-1 rounded-full transition-all duration-150 hover:scale-y-150 ${
                              value !== null && n <= value
                                ? "bg-blue-600"
                                : "bg-[var(--border)]/50 hover:bg-blue-400/50"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Written feedback */}
              <div className="space-y-2.5 border-t border-[var(--border)] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--muted)]">
                    What did you like? What could be better? What was your favourite moment?
                    <span className="mt-0.5 block text-[var(--muted)]/80">
                      🔒 Your feedback is private — only{" "}
                      {username ? <span className="font-medium">{username}</span> : "the poster"} and
                      you can see it.
                    </span>
                  </p>
                  {embedSrc && (
                    <button
                      type="button"
                      onClick={insertTimestamp}
                      title="Insert the video's current time into your comment"
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:border-blue-400/60 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      ⏱ Insert timestamp
                    </button>
                  )}
                </div>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Write your feedback here — timestamps like @1:24 help a lot..."
                />
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting || ratings.overall === null}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
                >
                  {submitting
                    ? hasExistingRating
                      ? "Updating..."
                      : "Submitting..."
                    : hasExistingRating
                      ? "Update feedback"
                      : "Submit feedback"}
                </button>
                {ratings.overall === null && (
                  <p className="text-xs text-[var(--muted)]">
                    Rate at least Overall to submit. The other categories are optional but appreciated.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Comments */}
      <div id="comments" className={cardClass}>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          {isPostAuthor ? "Comments" : "Your comments"} · {topLevelComments.length}
        </h2>
        {!isPostAuthor && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            🔒 Feedback here is private — reviewers only see their own comments (and any reply to
            them), and the poster sees everything.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {topLevelComments.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {isPostAuthor
                ? "No feedback yet — share your post to get some ears on it."
                : "You haven't left feedback yet. Be the first to riff on this."}
            </p>
          )}
          {topLevelComments.map((comment) => renderComment(comment, false))}
        </div>
      </div>
    </div>
  );
}
