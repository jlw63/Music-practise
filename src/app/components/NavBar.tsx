"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export function NavBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center">
        {/* Left: brand */}
        <div className="flex items-center">
          <Link href="/" className="text-xl font-semibold text-indigo-600">
            Music
          </Link>
        </div>

        {/* Center: nav links */}
        <div className="flex-1 flex justify-center gap-6">
          <Link href="/" className="text-foreground hover:text-indigo-500 px-3 py-2 rounded-md transition">
            Latest
          </Link>

          {user && (
            <Link href="/following" className="text-foreground hover:text-indigo-500 px-3 py-2 rounded-md transition">
              Following
            </Link>
          )}

          <Link href="/notifications" className="text-foreground hover:text-indigo-500 px-3 py-2 rounded-md transition">
            🔔
          </Link>

          <Link href="/create" className="hidden md:inline text-foreground hover:text-indigo-500 px-3 py-2 rounded-md transition">
            Create
          </Link>
        </div>

        {/* Right: auth + theme actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="px-2 py-1 rounded-md border text-foreground hover:bg-gray-100/40"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          {!user ? (
            <>
              <Link href="/login" className="text-sm text-foreground hover:text-indigo-500 px-3 py-2 rounded-md">
                Login
              </Link>
              <Link href="/signup" className="bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700 transition">
                Signup
              </Link>
            </>
          ) : (
            <>
              <Link href="/profile" className="text-sm text-foreground hover:text-indigo-500 px-3 py-2 rounded-md">
                {user.email}
              </Link>
              <button
                onClick={logout}
                className="text-sm px-3 py-2 rounded-md border"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}