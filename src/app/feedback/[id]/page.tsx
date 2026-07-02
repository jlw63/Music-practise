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
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const storedRating = window.localStorage.getItem(`feedback-rating-${postId}`);
    if (storedRating) {
      setRating(Number(storedRating));
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

  async function handleRatingSelect(nextRating: number) {
    setRating(nextRating);
    window.localStorage.setItem(`feedback-rating-${postId}`, String(nextRating));

    if (user && postId) {
      try {
        await supabase.from("feedback_ratings").upsert(
          {
            post_id: postId,
            user_id: user.id,
            rating: nextRating,
          },
          { onConflict: "post_id,user_id" }
        );
      } catch (error) {
        console.log("Rating save skipped:", error);
      }
    }
  }

  async function handleSubmit() {
    if (!user || !commentText.trim() || !post) return;

    setSubmitting(true);

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

    setSubmitting(false);
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

      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Rate this feedback</h2>
        <div className="mt-3 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRatingSelect(value)}
              className={`rounded px-3 py-2 text-sm ${rating === value ? "bg-indigo-600 text-white" : "border"}`}
            >
              {value}★
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-500">You chose {rating} out of 5.</p>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Comments</h2>

        {user ? (
          <div className="mt-4 space-y-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-24 w-full rounded border p-3"
              placeholder="Write a comment"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Posting..." : "Post comment"}
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
