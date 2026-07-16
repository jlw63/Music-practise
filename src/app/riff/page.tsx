"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const RATING_PREVIEW = [
  { label: "Accuracy", value: 8 },
  { label: "Dynamics", value: 7 },
  { label: "Interpretation", value: 9 },
  { label: "Technique", value: 8 },
];

function MockRatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium text-[var(--muted)]">{label}</span>
      <div className="flex flex-1 items-center gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={`h-2 flex-1 rounded-full ${
              n <= value ? "bg-blue-600" : "bg-[var(--border)]/50"
            }`}
          />
        ))}
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold text-blue-600 dark:text-blue-400">
        {value}/10
      </span>
    </div>
  );
}

export default function RiffPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ members: number; weekPosts: number } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [membersRes, weekPostsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .gte("created_at", weekAgo),
      ]);

      if (membersRes.error || weekPostsRes.error) return;
      setStats({
        members: membersRes.count ?? 0,
        weekPosts: weekPostsRes.count ?? 0,
      });
    }

    fetchStats();
  }, []);

  const sectionCard =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm";

  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 pb-10">
      {/* Hero */}
      <section className="pt-8 text-center sm:pt-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="riff logo" className="mx-auto h-20 w-20 sm:h-24 sm:w-24" />
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Where musicians <span className="text-blue-600 dark:text-blue-400">riff</span> on each
          other&apos;s work
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Post a performance and get scored, timestamped feedback from real musicians — not just
          likes. Then return the favour.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {user ? (
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20"
            >
              Create a post
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20"
            >
              Sign up — it&apos;s free
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-blue-400/60 hover:text-blue-600 dark:hover:text-blue-400"
          >
            Browse latest posts
          </Link>
        </div>

        {/* Community proof */}
        {stats && stats.members > 0 && (
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-8 text-sm text-[var(--muted)]">
            <span>
              <span className="font-bold text-[var(--foreground)]">{stats.members}</span>{" "}
              musician{stats.members === 1 ? "" : "s"}
            </span>
            <span className="h-4 w-px bg-[var(--border)]" />
            <span>
              <span className="font-bold text-[var(--foreground)]">{stats.weekPosts}</span> post
              {stats.weekPosts === 1 ? "" : "s"} this week
            </span>
          </div>
        )}
      </section>

      {/* Share your practice */}
      <section className="flex flex-col items-center gap-8 md:flex-row">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Share the <span className="text-blue-600 dark:text-blue-400">work in progress</span>,
            not just the highlight reel
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Post practice videos, finished takes, or open discussions. Tag the genre and
            instruments, mark it as WIP, and let the community find it.
          </p>
        </div>
        {/* Post card illustration */}
        <div className="w-full max-w-sm flex-1">
          <div className={sectionCard} aria-hidden="true">
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              Classical
            </span>
            <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
              Chopin Nocturne Op. 9 — take 3
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">mia_keys · 2d ago</p>
            <div className="mt-3 flex h-28 items-center justify-center rounded-xl bg-[var(--border)]/30">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg text-blue-600 shadow">
                ▶
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 border-t border-[var(--border)] pt-2.5 text-xs font-medium text-[var(--muted)]">
              <span className="text-blue-600 dark:text-blue-400">♥ 12</span>
              <span>💬 4</span>
              <span>↗ Share</span>
            </div>
          </div>
        </div>
      </section>

      {/* Structured feedback — the differentiator */}
      <section className="flex flex-col items-center gap-8 md:flex-row-reverse">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Structured feedback,{" "}
            <span className="text-blue-600 dark:text-blue-400">not just likes</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Ask for feedback and get scored on{" "}
            <span className="font-medium text-[var(--foreground)]">accuracy</span>,{" "}
            <span className="font-medium text-[var(--foreground)]">dynamics</span>,{" "}
            <span className="font-medium text-[var(--foreground)]">interpretation</span> and{" "}
            <span className="font-medium text-[var(--foreground)]">technique</span> — by musicians
            who play your instrument.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Written feedback is private between you and the reviewer, and timestamped comments like{" "}
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
              @1:24
            </span>{" "}
            point at the exact moment that needs work.
          </p>
        </div>
        {/* Rating panel illustration */}
        <div className="w-full max-w-sm flex-1">
          <div className={sectionCard} aria-hidden="true">
            <p className="text-sm font-bold text-[var(--foreground)]">Rate this performance</p>
            <div className="mt-3 space-y-2.5">
              {RATING_PREVIEW.map((r) => (
                <MockRatingBar key={r.label} label={r.label} value={r.value} />
              ))}
            </div>
            <div className="mt-4 rounded-xl border-l-2 border-blue-500/60 bg-[var(--border)]/15 px-3 py-2">
              <p className="text-xs leading-relaxed text-[var(--foreground)]/90">
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  @1:24
                </span>{" "}
                lovely rubato here — try holding the F a touch longer before resolving.
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">jazz_tom · just now</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Upload",
              body: "Record your practice, put it on YouTube, and post it — polished or not.",
            },
            {
              step: "2",
              title: "Get rated & timestamped feedback",
              body: "Musicians score four categories and leave private, timestamped notes.",
            },
            {
              step: "3",
              title: "Improve & repeat",
              body: "Log your practice, watch your streak grow, and post the next take.",
            },
          ].map((item) => (
            <div key={item.step} className={sectionCard}>
              <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                {item.step}
              </span>
              <h3 className="mt-2 font-bold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
          FAQ
        </h2>
        <div className="mt-6 space-y-4">
          {[
            {
              q: "Do I need to be good?",
              a: "No. riff is built for practice — work-in-progress takes are the point, not the exception. Mark a post as WIP and nobody expects perfection.",
            },
            {
              q: "What can I post?",
              a: "Performance videos (hosted on YouTube), open discussions, and feedback requests. Tag the genre and instruments so the right people find it.",
            },
            {
              q: "Who sees my feedback?",
              a: "Written feedback on a request is private: only you and the person who asked can read it. Ratings, likes and regular post comments are public.",
            },
          ].map((item) => (
            <div key={item.q} className={sectionCard}>
              <h3 className="font-bold text-[var(--foreground)]">{item.q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] pt-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-[var(--muted)]">
          <Link href="/" className="transition hover:text-blue-600 dark:hover:text-blue-400">
            Latest posts
          </Link>
          <Link
            href="/feedback"
            className="transition hover:text-blue-600 dark:hover:text-blue-400"
          >
            Feedback feed
          </Link>
          <Link href="/create" className="transition hover:text-blue-600 dark:hover:text-blue-400">
            Create a post
          </Link>
          <Link href="/search" className="transition hover:text-blue-600 dark:hover:text-blue-400">
            Search
          </Link>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          House rule: be kind, be specific — riff on the music, not the musician. 🎵
        </p>
      </footer>
    </div>
  );
}
