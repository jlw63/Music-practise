"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    genre?: string | null;
    instruments?: string[] | null;
    status?: "wip" | "finished" | null;
    profiles?: {
      username: string;
    };
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
        genre,
        instruments,
        status,
        profiles!posts_author_id_fkey(username)
      `)
      .in("type", ["video", "discussion"])
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.log(error);
      return [];
    }

    return (data ?? []) as unknown as Post[];
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

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const data = await fetchPosts(posts.length);
    setPosts((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [fetchPosts, posts.length]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading || !hasMore) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasMore, loadingMore, loadMore]);

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
          variant="feed"
        />
      ))}

      {!loading && hasMore && (
        <div ref={sentinelRef} className="flex justify-center pb-6">
          {loadingMore && (
            <span className="text-sm text-[var(--muted)]">Loading...</span>
          )}
        </div>
      )}

    </div>
  );
}
