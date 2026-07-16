"use client";

import Link from "next/link";

type User = {
  id: string;
  username: string;
};

type Props = {
  users: User[];
};

export default function UserList({ users }: Props) {
  return (
    <div className="space-y-2">
      {users.map((user) => (
        <Link key={user.id} href={`/profile/${user.id}`} className="block">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-all duration-200 hover:border-blue-400/60 hover:bg-blue-500/5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="truncate text-sm font-medium text-[var(--foreground)]">
              {user.username}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
