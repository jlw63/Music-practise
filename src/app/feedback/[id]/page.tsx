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
  profiles?: {
    username: string;
  }[];
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: {
    username: string;
  }[];
};

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
  if (loading) return <p>Loading feedback...</p>;
  if (!post) return <p>Feedback not found.</p>;

  const authorName = post.profiles?.[0]?.username || "Unknown";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/feedback" className="text-sm text-indigo-600 hover:underline">
        ← Back to feedback feed
      </Link>

      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          <span className="text-sm text-gray-500">by {authorName}</span>
        </div>
        <p className="mt-4 text-gray-700">{post.content}</p>

        {post.video_url && (
          <div className="mt-6">
            <h2 className="mb-2 font-semibold">Video</h2>
            <div className="aspect-video overflow-hidden rounded-lg border">
              <iframe src={post.video_url} title={post.title} className="h-full w-full" allowFullScreen />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Rate this feedback</h2>
        <p className="text-sm text-gray-500">1 = needs improvement, 10 = basically perfect</p>

        {[
          { key: "overall", label: "Overall rating" },
          { key: "accuracy", label: "Accuracy - correct notes & rhythm" },
          { key: "dynamics", label: "Dynamics" },
          { key: "interpretation", label: "Interpretation" },
          { key: "technique", label: "Technique" },
        ].map((category) => (
          <div key={category.key} className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium">{category.label}</h3>
              <span className="text-sm text-gray-500">
                {ratings[category.key as keyof typeof ratings] !== null ? `${ratings[category.key as keyof typeof ratings]}/10` : "Not rated"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRatingChange(category.key as keyof typeof ratings, value)}
                  className={`rounded px-3 py-2 text-sm ${ratings[category.key as keyof typeof ratings] === value ? "bg-indigo-600 text-white" : "border bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-700"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleRatingSubmit}
          disabled={ratingSubmitting || !Object.values(ratings).every((value) => value !== null)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {ratingSubmitting ? "Saving ratings..." : "Submit ratings"}
        </button>
        {!Object.values(ratings).every((value) => value !== null) && (
          <p className="text-sm text-amber-500">Please rate every category before submitting.</p>
        )}
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Comments</h2>

        {user ? (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-medium">What did you like? What could be better? What was your favourite moment? (Add timestamps if you can.)</p>
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-24 w-full rounded border p-3"
              placeholder="Write your feedback here..."
            />
            <button
              onClick={handleCommentSubmit}
              disabled={commentSubmitting}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {commentSubmitting ? "Posting comment..." : "Submit comment"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Log in to leave a comment.</p>
        )}

        <div className="mt-6 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{comment.profiles?.[0]?.username || "Unknown"}</p>
                <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
