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
  profiles?: { username: string }[];
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: { username: string }[];
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
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  // scores start empty on purpose — pre-filled scores invite lazy straight-10s
  const [ratings, setRatings] = useState<Ratings>(() => {
    if (typeof window === "undefined" || !postId) return EMPTY_RATINGS;
    try {
      const stored = window.localStorage.getItem(`feedback-ratings-${postId}`);
      if (!stored) return EMPTY_RATINGS;
      const parsed = JSON.parse(stored);
      return {
        overall: parsed.overall ?? null,
        accuracy: parsed.accuracy ?? null,
        dynamics: parsed.dynamics ?? null,
        interpretation: parsed.interpretation ?? null,
        technique: parsed.technique ?? null,
      };
    } catch {
      return EMPTY_RATINGS;
    }
  });
  const [submitting, setSubmitting] = useState(false);

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

      setPost(data);
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
          profiles!comments_author_id_fkey(username)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (!error) {
        setComments(data || []);
      }
    }

    fetchPost();
    fetchComments();
  }, [postId]);

  function handleRatingChange(category: keyof Ratings, nextRating: number) {
    setRatings((prev) => {
      const next = { ...prev, [category]: nextRating };
      window.localStorage.setItem(`feedback-ratings-${postId}`, JSON.stringify(next));
      return next;
    });
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

    try {
      await supabase.from("feedback_ratings").upsert(
        {
          post_id: postId,
          user_id: user.id,
          rating: ratings.overall,
        },
        { onConflict: "post_id,user_id" }
      );
    } catch (error) {
      console.log("Rating save skipped:", error);
    }

    if (commentText.trim()) {
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
          profiles!comments_author_id_fkey(username)
        `)
        .eq("post_id", post.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestComment) {
        setComments((prev) => [...prev, latestComment]);
      }
      setCommentText("");
    }

    setSubmitting(false);
    toast("Feedback submitted — thanks for helping them improve! 🎵", "success");
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

  const username = post.profiles?.[0]?.username;
  const ratedCount = Object.values(ratings).filter((v) => v !== null).length;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const embedSrc = post.video_url
    ? post.video_url + (post.video_url.includes("?") ? "&" : "?") + "enablejsapi=1"
    : undefined;

  const cardClass =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm scroll-mt-32";

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
          Give feedback
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              ratings.overall !== null
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            }`}
          >
            {ratedCount}/{RATING_CATEGORIES.length}
          </span>
        </button>
        <button
          onClick={() => scrollTo("comments")}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Comments
          <span className="rounded-full bg-[var(--border)]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {comments.length}
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

      {/* Give feedback: ratings + written comment in one form */}
      <div id="give-feedback" className={cardClass + " space-y-1"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Rate this performance</h2>
          <span className="text-xs font-medium text-[var(--muted)]">
            1 = needs improvement · 10 = basically perfect
          </span>
        </div>

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
                {submitting ? "Submitting..." : "Submit feedback"}
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

      {/* Comments */}
      <div id="comments" className={cardClass}>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Comments · {comments.length}
        </h2>

        <div className="mt-4 space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Be the first to riff on this.</p>
          )}
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border-l-2 border-[var(--border)] pl-3 py-1.5 transition-colors hover:border-blue-400/60"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {comment.profiles?.[0]?.username || "Anonymous"}
                </p>
                <span className="text-xs text-[var(--muted)]">
                  {timeAgo(comment.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--foreground)]/90">{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
