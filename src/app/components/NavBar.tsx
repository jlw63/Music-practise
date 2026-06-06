"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-base-300 p-4 flex gap-4">
      <Link href="/">Feed</Link>

      {!user ? (
        <>
          <Link href="/login">Login</Link>
          <Link href="/signup">Signup</Link>
        </>
      ) : (
        <>
          <Link href="/create">Create</Link>
          <Link href="/profile">Profile</Link>

          <button onClick={logout} className="ml-auto">
            Logout
          </button>
        </>
      )}
    </nav>
  );
}