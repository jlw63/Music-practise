"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export function NavBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const linkClass = (href: string) => {
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
    return `px-3 py-2 rounded-md transition-colors ${isActive ? "text-indigo-700 font-semibold bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-900" : "text-foreground hover:text-indigo-800 hover:bg-indigo-200 dark:hover:text-indigo-200 dark:hover:bg-white/10"}`;
  };

  return (
    // Added relative here so the absolute center positioning works perfectly
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] relative">
      {/* Changed from grid to a flex layout with justify-between */}
      <div className="flex w-full px-6 items-center justify-between gap-4 py-3 h-14">
        
        {/* 1. LEFT POSITION: MusicSocial Logo */}
        <div className="flex items-center gap-3 z-10">
          <Link href="/music-social" className="text-xl font-semibold tracking-tight text-indigo-500 hover:text-indigo-400">
            MusicSocial
          </Link>
        </div>

        {/* 2. MIDDLE POSITION: Dead Centered Links */}
        {/* Using absolute positioning breaks it out of the side layouts to ensure true screen centering */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-4 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link href="/" className={linkClass("/")}>
            Latest
          </Link>
          {user && (
            <Link href="/following" className={linkClass("/following")}>
              Following
            </Link>
          )}
          <Link href="/notifications" className={linkClass("/notifications")}>
            🔔
          </Link>
          <Link href="/feedback" className={linkClass("/feedback")}>
            Feedback
          </Link>
          <Link href="/create" className={`${linkClass("/create")} hidden md:inline`}>
            Create
          </Link>
        </div>

        {/* 3. RIGHT POSITION: Theme Toggle & User Info */}
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-foreground hover:bg-[var(--foreground)]/10 transition"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          {!user ? (
            <>
              <Link href="/login" className="text-sm text-foreground hover:text-indigo-700 dark:hover:text-indigo-200 px-3 py-2 rounded-md transition">
                Login
              </Link>
              <Link href="/signup" className="bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700 transition">
                Signup
              </Link>
            </>
          ) : (
            <>
              <Link href="/profile" className="text-sm text-foreground hover:text-indigo-700 dark:hover:text-indigo-200 px-3 py-2 rounded-md transition">
                {user.email}
              </Link>
              <button
                onClick={logout}
                className="text-sm px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-foreground hover:bg-[var(--foreground)]/10 transition"
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