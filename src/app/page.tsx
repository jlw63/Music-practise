"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import PostCard from "@/app/components/PostCards";

const PAGE_SIZE = 5;

export default function Home() {

  type Post = {
    id: string;
    title: string;
    content: string;
    type: "video" | "discussion";
    video_url?: string;
    created_at: string;
    author_id: string;
    profiles?: {
      username: string;
    }[];
  };

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (offset: number) => {
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
      .in("type", ["video", "discussion"])
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.log(error);
      return [];
    }

    return data || [];
  }, []);

  useEffect(() => {
    async function initialLoad() {
      const data = await fetchPosts(0);
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }

    initialLoad();
  }, [fetchPosts]);

  async function loadMore() {
    setLoadingMore(true);
    const data = await fetchPosts(posts.length);
    setPosts((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4">

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 rounded bg-[var(--border)]" />
                <div className="h-2.5 w-16 rounded bg-[var(--border)]/70" />
              </div>
              <div className="mt-4 h-5 w-2/3 rounded bg-[var(--border)]" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-[var(--border)]/70" />
                <div className="h-3 w-4/5 rounded bg-[var(--border)]/70" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center">
          <p className="text-3xl">🎵</p>
          <p className="mt-3 font-semibold text-[var(--foreground)]">No posts yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Be the first to share a practice video or start a discussion.
          </p>
        </div>
      )}

      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
        />
      ))}

      {!loading && hasMore && (
        <div className="flex justify-center pb-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-200 hover:border-indigo-400/60 hover:text-indigo-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-indigo-400"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

    </div>
  );
}
