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
    return `relative px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 group ${
      isActive
        ? "text-indigo-900 bg-indigo-200/80 dark:text-indigo-200 dark:bg-indigo-950/60 border border-indigo-300/50 dark:border-indigo-800/50 shadow-sm"
        : "text-foreground border border-transparent hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200/70 hover:-translate-y-[1px] dark:hover:text-indigo-300 dark:hover:bg-indigo-500/10 dark:hover:border-indigo-400/30"
    }`;
  };

  // underline that fades/slides in on hover, hidden on active (active already has its own pill)
  const underline = (href: string) => {
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
    if (isActive) return null;
    return (
      <span className="pointer-events-none absolute left-3 right-3 -bottom-0.5 h-[2px] scale-x-0 bg-indigo-500 dark:bg-indigo-400 origin-left transition-transform duration-200 group-hover:scale-x-100 rounded-full" />
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md shadow-sm relative">
      <div className="flex w-full px-6 items-center justify-between gap-4 py-3 h-14">

        {/* LOGO */}
        <div className="flex items-center gap-3 z-10">
          <Link
            href="/music-social"
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-300 bg-clip-text text-transparent hover:opacity-80 transition"
          >
            MusicSocial
          </Link>
        </div>

        {/* CENTER LINKS */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link href="/" className={linkClass("/")}>
            Latest
            {underline("/")}
          </Link>
          {user && (
            <Link href="/following" className={linkClass("/following")}>
              Following
              {underline("/following")}
            </Link>
          )}
          <Link href="/notifications" className={linkClass("/notifications")} title="Notifications">
            🔔
            {underline("/notifications")}
          </Link>
          <Link href="/feedback" className={linkClass("/feedback")}>
            Feedback
            {underline("/feedback")}
          </Link>
          <Link href="/create" className={`${linkClass("/create")} hidden md:inline`}>
            Create
            {underline("/create")}
          </Link>
        </div>

        {/* RIGHT: THEME + USER */}
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-foreground hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200/70 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 dark:hover:border-indigo-400/30 transition-all duration-200 hover:-translate-y-[1px]"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          {!user ? (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-foreground px-3 py-2 rounded-md border border-transparent hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200/70 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 dark:hover:border-indigo-400/30 transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm hover:shadow-md hover:shadow-indigo-500/30 hover:-translate-y-[1px] active:scale-95 active:translate-y-0 transition-all duration-200"
              >
                Signup
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/profile"
                title="View Profile"
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground px-3 py-1.5 rounded-full border border-gray-300 dark:border-slate-700 bg-[var(--surface)] hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-sm dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-600 dark:text-indigo-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <span className="max-w-[100px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </Link>

              <button
                onClick={logout}
                className="text-sm px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-foreground hover:bg-red-600 hover:text-white hover:border-red-600 hover:-translate-y-[1px] dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:hover:border-red-900 transition-all duration-200"
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