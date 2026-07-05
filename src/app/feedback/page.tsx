"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
  profiles?: {
    username: string;
  }[];
};

export default function FeedbackFeedPage() {
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeedbackPosts() {
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
        .eq("type", "feedback")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPosts(data || []);
      setLoading(false);
    }

    fetchFeedbackPosts();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feedback Feed</h1>
          <p className="text-sm text-gray-500">Browse ideas, issues, and suggestions.</p>
        </div>
        <Link
          href="/create"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New feedback
        </Link>
      </div>

      {loading && <p>Loading feedback...</p>}

      {!loading && posts.length === 0 && (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          No feedback posts yet. Be the first to share one.
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => {
          const authorName = post.profiles?.[0]?.username || "Unknown";

          return (
            <Link
              key={post.id}
              href={`/feedback/${post.id}`}
              className="block rounded-lg border p-4 transition hover:border-indigo-500 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{post.title}</h2>
                  <p className="mt-1 text-sm text-muted">{post.content}</p>
                  {(post.genre || (post.instruments && post.instruments.length > 0) || post.status === "wip") && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.status === "wip" && (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          WIP
                        </span>
                      )}
                      {post.genre && (
                        <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                          {post.genre}
                        </span>
                      )}
                      {post.instruments?.map((inst) => (
                        <span
                          key={inst}
                          className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400"
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted">by {authorName}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
