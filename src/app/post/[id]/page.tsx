"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PostCard from "@/app/components/PostCards";

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

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.log(error);
      }

      setPost(data as unknown as Post);
      setLoading(false);
    }

    fetchPost();
  }, [postId]);

  return (
    <div className="mx-auto max-w-3xl px-4">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] transition hover:text-blue-600 dark:hover:text-blue-400"
      >
        ← Back to feed
      </Link>

      {loading && (
        <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
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
      )}

      {!loading && !post && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center">
          <p className="text-3xl">🤔</p>
          <p className="mt-3 font-semibold text-[var(--foreground)]">Post not found</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            This post may have been deleted.
          </p>
        </div>
      )}

      {post && <PostCard post={post} />}
    </div>
  );
}
