"use client";

import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import { useEffect, useState } from "react";

type Session = {
  id: string;
  user_id: string;
  instrument: string;
  duration_minutes: number;
  notes: string | null;
  practised_at: string;
};

type Props = {
  userId: string;
  editable: boolean;
};

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function calcStreak(sessions: Session[]) {
  const days = new Set(sessions.map((s) => s.practised_at));
  let streak = 0;
  const d = new Date();
  // a streak survives if today hasn't been logged yet
  if (!days.has(localDateKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(localDateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function PracticeLog({ userId, editable }: Props) {
  const { toast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const [instrument, setInstrument] = useState("");
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      const { data, error } = await supabase
        .from("practice_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("practised_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(90);

      if (error) {
        // table probably doesn't exist yet — degrade gracefully
        setTableMissing(true);
        setLoading(false);
        return;
      }

      setSessions(data || []);
      setLoading(false);
    }

    fetchSessions();
  }, [userId]);

  async function logSession() {
    if (!instrument.trim()) {
      toast("What did you practise? Add an instrument.", "info");
      return;
    }
    const mins = parseInt(minutes, 10);
    if (!mins || mins <= 0) {
      toast("Enter how many minutes you practised.", "info");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("practice_sessions")
      .insert({
        user_id: userId,
        instrument: instrument.trim(),
        duration_minutes: mins,
        notes: notes.trim() || null,
        practised_at: localDateKey(new Date()),
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast("Could not log session: " + error.message, "error");
      return;
    }

    setSessions((prev) => [data, ...prev]);
    setInstrument("");
    setMinutes("");
    setNotes("");
    toast("Practice session logged! 🎶", "success");
  }

  async function deleteSession(id: string) {
    const { data, error } = await supabase
      .from("practice_sessions")
      .delete()
      .eq("id", id)
      .select();

    if (error || !data || data.length === 0) {
      toast("Could not delete session.", "error");
      return;
    }

    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  if (tableMissing) {
    if (!editable) return null;
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-5 text-sm text-[var(--muted)]">
        🎯 Practice log isn&apos;t set up yet — run <span className="font-mono font-semibold">supabase-setup.sql</span> in
        your Supabase SQL editor to enable it.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="h-4 w-32 rounded bg-[var(--border)]" />
        <div className="mt-4 h-20 rounded bg-[var(--border)]/50" />
      </div>
    );
  }

  const streak = calcStreak(sessions);

  // last 7 days of practice minutes
  const week = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localDateKey(d);
    const mins = sessions
      .filter((s) => s.practised_at === key)
      .reduce((sum, s) => sum + s.duration_minutes, 0);
    return {
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      minutes: mins,
      isToday: i === 6,
    };
  });
  const maxMinutes = Math.max(...week.map((w) => w.minutes), 1);
  const weekTotal = week.reduce((sum, w) => sum + w.minutes, 0);

  const recent = sessions.slice(0, 5);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Practice log
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-semibold text-orange-500">
            🔥 {streak} day{streak === 1 ? "" : "s"} streak
          </span>
          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            {weekTotal} min this week
          </span>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="mt-4 flex h-24 items-end gap-2">
        {week.map((day, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-300 ${
                  day.minutes > 0
                    ? "bg-gradient-to-t from-indigo-600 to-violet-500"
                    : "bg-[var(--border)]/40"
                }`}
                style={{
                  height: day.minutes > 0 ? `${Math.max((day.minutes / maxMinutes) * 100, 12)}%` : "6px",
                }}
                title={`${day.minutes} min`}
              />
            </div>
            <span
              className={`text-[10px] font-medium ${
                day.isToday ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--muted)]"
              }`}
            >
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Log form */}
      {editable && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Instrument (e.g. Guitar)"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            />
            <input
              className="w-24 rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Mins"
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Notes — what did you work on? (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && logSession()}
          />
          <button
            onClick={logSession}
            disabled={saving}
            className="mt-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-indigo-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Logging..." : "Log session"}
          </button>
        </div>
      )}

      {/* Recent sessions */}
      {recent.length > 0 && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Recent sessions
          </h3>
          <div className="space-y-1.5">
            {recent.map((session) => (
              <div
                key={session.id}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--border)]/20"
              >
                <span className="font-medium text-[var(--foreground)]">{session.instrument}</span>
                <span className="text-[var(--muted)]">· {session.duration_minutes} min</span>
                {session.notes && (
                  <span className="min-w-0 truncate text-[var(--muted)]">— {session.notes}</span>
                )}
                <span className="ml-auto shrink-0 text-xs text-[var(--muted)]">
                  {new Date(session.practised_at + "T00:00:00").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {editable && (
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="shrink-0 text-xs text-[var(--muted)] opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                    aria-label="Delete session"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
