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
    return `px-3 py-2 rounded-md transition ${isActive ? "text-indigo-700 font-semibold bg-indigo-100" : "text-foreground hover:text-indigo-700 hover:bg-indigo-100"}`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="grid w-full px-6 grid-cols-[max-content_1fr_max-content] items-center justify-items-stretch gap-4 py-3">
        
        {/* 1. LEFT POSITION: MusicSocial Logo */}
        <div className="justify-self-start flex items-center gap-3">
          <Link href="/music-social" className="text-xl font-semibold tracking-tight text-indigo-500 hover:text-indigo-400">
            MusicSocial
          </Link>
        </div>

        {/* 2. MIDDLE POSITION: Navigation Links (Perfectly Centered) */}
        <div className="hidden sm:flex justify-self-center items-center gap-2 sm:gap-4">
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

        {/* 3. RIGHT POSITION: Theme Toggle & User Info / Logout */}
        <div className="justify-self-end flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-foreground hover:bg-[var(--foreground)]/10 transition"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          {!user ? (
            <>
              <Link href="/login" className="text-sm text-foreground hover:text-indigo-700 px-3 py-2 rounded-md transition">
                Login
              </Link>
              <Link href="/signup" className="bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700 transition">
                Signup
              </Link>
            </>
          ) : (
            <>
              {/* Added the user email display back here on the right */}
              <Link href="/profile" className="text-sm text-foreground hover:text-indigo-700 px-3 py-2 rounded-md transition">
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