"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-base-300 p-4 flex gap-4">
        <Link href="/">Latest</Link>

        {user && (
          <Link href="/following">
            Following
          </Link>
        )}
        <Link href="/notifications">
        🔔
        </Link>

      {!user ? (
        <>
          <Link href="/login">Login</Link>
          <Link href="/signup">Signup</Link>
        </>
      ) : (
        <>
          <Link href="/create">Create</Link>
          <Link href="/profile">Profile</Link>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm">{user.email}</span>
            <button onClick={logout}>
              Logout
            </button>
          </div>
        </>
      )}
    </nav>
  );
}