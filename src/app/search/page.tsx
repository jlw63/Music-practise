"use client";

import { supabase } from "@/lib/supabase";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  genre?: string | null;
  instruments?: string[] | null;
  status?: "wip" | "finished" | null;
};

type StatusFilter = "any" | "wip" | "finished";

function SearchPageInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [genreFilter, setGenreFilter] = useState(() => searchParams.get("genre") ?? "");
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("any");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // debounced live search
  useEffect(() => {
    const q = query.trim();
    const genre = genreFilter.trim();
    const instrument = instrumentFilter.trim();
    const hasFilters = genre.length > 0 || instrument.length > 0 || statusFilter !== "any";

    if (q.length < 2 && !hasFilters) {
      setUsers([]);
      setPosts([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    const handle = setTimeout(async () => {
      let postQuery = supabase
        .from("posts")
        .select("id, title, content, type, created_at, genre, instruments, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (q.length >= 2) {
        postQuery = postQuery.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
      }
      if (genre.length > 0) {
        postQuery = postQuery.ilike("genre", `%${genre}%`);
      }
      if (instrument.length > 0) {
        postQuery = postQuery.contains("instruments", [instrument]);
      }
      if (statusFilter !== "any") {
        postQuery = postQuery.eq("status", statusFilter);
      }

      const [userRes, postRes] = await Promise.all([
        q.length >= 2
          ? supabase
              .from("profiles")
              .select("id, username")
              .ilike("username", `%${q}%`)
              .limit(10)
          : Promise.resolve({ data: [] as UserResult[] }),
        postQuery,
      ]);

      setUsers(userRes.data || []);
      setPosts(postRes.data || []);
      setSearching(false);
      setSearched(true);
    }, 300);

    return () => clearTimeout(handle);
  }, [query, genreFilter, instrumentFilter, statusFilter]);

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
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] shadow-sm outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          placeholder="Search users and posts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className="w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          placeholder="Genre"
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
        />
        <input
          className="w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          placeholder="Instrument"
          value={instrumentFilter}
          onChange={(e) => setInstrumentFilter(e.target.value)}
        />
        <div
          role="group"
          aria-label="Filter by status"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"
        >
          <span className="pl-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Status
          </span>
          {([
            { value: "any" as StatusFilter, label: "Any", title: "All posts" },
            { value: "finished" as StatusFilter, label: "Finished", title: "Completed tracks" },
            { value: "wip" as StatusFilter, label: "WIP", title: "Work in progress" },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.title}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                statusFilter === option.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-blue-500/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
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
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all duration-200 hover:border-blue-400/60 hover:bg-blue-500/5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-semibold text-[var(--foreground)]">
                      {post.title}
                    </h3>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{post.content}</p>
                  {(post.genre || (post.instruments && post.instruments.length > 0) || post.status === "wip") && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.status === "wip" && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          WIP
                        </span>
                      )}
                      {post.genre && (
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          {post.genre}
                        </span>
                      )}
                      {post.instruments?.map((inst) => (
                        <span
                          key={inst}
                          className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400"
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
