"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import UserList from "@/app/components/UserList";
import { timeAgo } from "@/lib/timeAgo";

type UserResult = {
  id: string;
  username: string;
};

type PostResult = {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // debounced live search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setUsers([]);
      setPosts([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    const handle = setTimeout(async () => {
      const [userRes, postRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username")
          .ilike("username", `%${q}%`)
          .limit(10),
        supabase
          .from("posts")
          .select("id, title, content, type, created_at")
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setUsers(userRes.data || []);
      setPosts(postRes.data || []);
      setSearching(false);
      setSearched(true);
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const noResults = searched && !searching && users.length === 0 && posts.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4">
      <h1 className="mb-5 text-3xl font-bold tracking-tight text-[var(--foreground)]">Search</h1>

      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          🔍
        </span>
        <input
          autoFocus
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] shadow-sm outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          placeholder="Search users and posts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="mt-3 text-sm text-[var(--muted)]">Type at least 2 characters...</p>
      )}

      {searching && (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            />
          ))}
        </div>
      )}

      {noResults && (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center">
          <p className="text-3xl">🔍</p>
          <p className="mt-3 font-semibold text-[var(--foreground)]">No results</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Nothing matched &quot;{query.trim()}&quot; — try a different search.
          </p>
        </div>
      )}

      {!searching && users.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Users
          </h2>
          <UserList users={users} />
        </div>
      )}

      {!searching && posts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Posts
          </h2>
          <div className="space-y-2">
            {posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="block">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all duration-200 hover:border-indigo-400/60 hover:bg-indigo-500/5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-semibold text-[var(--foreground)]">
                      {post.title}
                    </h3>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{post.content}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
