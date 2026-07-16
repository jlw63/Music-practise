"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
  { key: "overall", label: "Overall rating" },
  { key: "accuracy", label: "Accuracy", hint: "Correct notes & rhythm" },
  { key: "dynamics", label: "Dynamics" },
  { key: "interpretation", label: "Interpretation" },
  { key: "technique", label: "Technique" },
] as const;

export default function FeedbackDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const postId = params?.id as string;

  const [post, setPost] = useState<FeedbackPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [ratings, setRatings] = useState<{
    overall: number | null;
    accuracy: number | null;
    dynamics: number | null;
    interpretation: number | null;
    technique: number | null;
  }>({
    overall: null,
    accuracy: null,
    dynamics: null,
    interpretation: null,
    technique: null,
  });
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const storedRatings = window.localStorage.getItem(`feedback-ratings-${postId}`);
    if (storedRatings) {
      try {
        const parsed = JSON.parse(storedRatings);
        setRatings({
          overall: parsed.overall ?? null,
          accuracy: parsed.accuracy ?? null,
          dynamics: parsed.dynamics ?? null,
          interpretation: parsed.interpretation ?? null,
          technique: parsed.technique ?? null,
        });
      } catch {
        // ignore invalid saved state
      }
    }

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

  function handleRatingChange(category: keyof typeof ratings, nextRating: number) {
    setRatings((prev) => {
      const next = { ...prev, [category]: nextRating };
      window.localStorage.setItem(`feedback-ratings-${postId}`, JSON.stringify(next));
      return next;
    });
  }

  async function handleRatingSubmit() {
    if (!user || !postId) return;
    const allRated = Object.values(ratings).every((value) => value !== null);
    if (!allRated) return;

    setRatingSubmitting(true);

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

    setRatingSubmitting(false);
  }

  async function handleCommentSubmit() {
    if (!user || !commentText.trim() || !post) return;

    setCommentSubmitting(true);

    const { error: commentError } = await supabase.from("comments").insert({
      post_id: post.id,
      author_id: user.id,
      content: commentText.trim(),
    });

    if (!commentError) {
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

    setCommentSubmitting(false);
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

  const authorName = post.profiles?.[0]?.username || "Unknown";
  const ratedCount = Object.values(ratings).filter((v) => v !== null).length;
  const allRated = ratedCount === RATING_CATEGORIES.length;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cardClass =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm";

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
          onClick={() => scrollTo("ratings")}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Ratings
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              allRated
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
            by <span className="font-medium text-[var(--foreground)]">{authorName}</span>
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

        {post.video_url && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Video
            </h2>
            <div className="aspect-video overflow-hidden rounded-xl border border-[var(--border)]">
              <iframe
                src={post.video_url}
                title={post.title}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>

      {/* Ratings */}
      <div id="ratings" className={cardClass + " space-y-1"}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Rate this feedback</h2>
          <span className="text-xs font-medium text-[var(--muted)]">
            1 = needs improvement · 10 = basically perfect
          </span>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {RATING_CATEGORIES.map((category) => {
            const value = ratings[category.key];
            return (
              <div key={category.key} className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      {category.label}
                    </h3>
                    {"hint" in category && category.hint && (
                      <p className="text-xs text-[var(--muted)]">{category.hint}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      value !== null
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "bg-[var(--border)]/30 text-[var(--muted)]"
                    }`}
                  >
                    {value !== null ? `${value}/10` : "Not rated"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleRatingChange(category.key, n)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        value === n
                          ? "bg-blue-600 text-white shadow-sm scale-105"
                          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleRatingSubmit}
            disabled={ratingSubmitting || !allRated}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
          >
            {ratingSubmitting ? "Saving ratings..." : "Submit ratings"}
          </button>
          {!allRated && (
            <p className="mt-2 text-xs text-amber-500">
              Please rate every category before submitting.
            </p>
          )}
        </div>
      </div>

      {/* Comments */}
      <div id="comments" className={cardClass}>
        <h2 className="text-lg font-bold text-[var(--foreground)]">Comments</h2>

        {user ? (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs font-medium text-[var(--muted)]">
              What did you like? What could be better? What was your favourite moment? (Add
              timestamps if you can.)
            </p>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="Write your feedback here..."
            />
            <button
              onClick={handleCommentSubmit}
              disabled={commentSubmitting || !commentText.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
            >
              {commentSubmitting ? "Posting comment..." : "Submit comment"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">Log in to leave a comment.</p>
        )}

        <div className="mt-6 space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No comments yet — be the first.</p>
          )}
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border-l-2 border-[var(--border)] pl-3 py-1.5 transition-colors hover:border-blue-400/60"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {comment.profiles?.[0]?.username || "Unknown"}
                </p>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(comment.created_at).toLocaleString()}
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