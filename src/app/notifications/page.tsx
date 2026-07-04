"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/timeAgo";

type Notification = {
  id: string;
  type: string;
  created_at: string;
  sender_id: string;
  post_id: string | null;
  read: boolean;
  sender: {
    username: string;
  };
};

const TYPE_META: Record<string, { icon: string; label: string; accent: string }> = {
  follow: { icon: "👤", label: "followed you", accent: "bg-indigo-500/10 text-indigo-500" },
  like: { icon: "♥", label: "liked your post", accent: "bg-red-500/10 text-red-500" },
  comment: { icon: "💬", label: "commented on your post", accent: "bg-emerald-500/10 text-emerald-500" },
};

export default function NotificationsPage() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchNotifications() {
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          profiles!notifications_sender_id_fkey(
            username
          )
        `)
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        setLoading(false);
        return;
      }

      const formatted =
        data?.map((n: any) => ({
          id: n.id,
          type: n.type,
          created_at: n.created_at,
          sender_id: n.sender_id,
          post_id: n.post_id ?? null,
          read: n.read ?? true,
          sender: {
            username:
              n.profiles?.username ||
              n.profiles?.[0]?.username ||
              "Unknown",
          },
        })) || [];

      setNotifications(formatted);
      setLoading(false);

      // mark everything read; ignore failure if the 'read' column doesn't exist yet
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
    }

    fetchNotifications();
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl px-4">
      <h1 className="mb-5 text-3xl font-bold tracking-tight text-[var(--foreground)]">
        Notifications
      </h1>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="h-9 w-9 rounded-full bg-[var(--border)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 rounded bg-[var(--border)]" />
                <div className="h-2.5 w-16 rounded bg-[var(--border)]/70" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center">
          <p className="text-3xl">🔔</p>
          <p className="mt-3 font-semibold text-[var(--foreground)]">No notifications yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            When someone follows you or interacts with your posts, it&apos;ll show up here.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => {
          const meta = TYPE_META[notification.type] ?? {
            icon: "🔔",
            label: notification.type,
            accent: "bg-[var(--border)]/30 text-[var(--muted)]",
          };
          return (
            <div
              key={notification.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-shadow duration-200 hover:shadow-md ${
                notification.read
                  ? "border-[var(--border)] bg-[var(--surface)]"
                  : "border-indigo-400/40 bg-indigo-500/5"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${meta.accent}`}
              >
                {meta.icon}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--foreground)]">
                  <Link
                    href={`/profile/${notification.sender_id}`}
                    className="font-semibold transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {notification.sender.username}
                  </Link>{" "}
                  <span className="text-[var(--foreground)]/80">{meta.label}</span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {timeAgo(notification.created_at)}
                </p>
              </div>

              {notification.post_id && (
                <Link
                  href={`/post/${notification.post_id}`}
                  className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-all hover:border-indigo-400/60 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  View post →
                </Link>
              )}

              {!notification.read && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-label="Unread" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
