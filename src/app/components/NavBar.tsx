"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // the notifications page marks everything read on open
    if (pathname === "/notifications") {
      setUnreadCount(0);
      return;
    }

    async function fetchUnread() {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("read", false);

      // errors here usually mean the 'read' column doesn't exist yet — hide the badge
      if (error) return;
      setUnreadCount(count || 0);
    }

    fetchUnread();
  }, [user, pathname]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const linkClass = (href: string) => {
    return `relative px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 group ${
      isActive(href)
        ? "text-blue-900 bg-blue-200/80 dark:text-blue-200 dark:bg-blue-500/25 border border-blue-300/50 dark:border-blue-400/40 shadow-sm"
        : "text-foreground border border-transparent hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200/70 hover:-translate-y-[1px] dark:hover:text-blue-300 dark:hover:bg-blue-500/10 dark:hover:border-blue-400/30"
    }`;
  };

  // underline that fades/slides in on hover, hidden on active (active already has its own pill)
  const underline = (href: string) => {
    if (isActive(href)) return null;
    return (
      <span className="pointer-events-none absolute left-3 right-3 -bottom-0.5 h-[2px] scale-x-0 bg-blue-500 dark:bg-blue-400 origin-left transition-transform duration-200 group-hover:scale-x-100 rounded-full" />
    );
  };

  // Latest/Following are rendered as tabs (underline-based), distinct from the icon-pill links
  const tabClass = (href: string) =>
    `border-b-2 px-1 pb-2 pt-1 text-sm font-semibold transition-colors duration-200 ${
      isActive(href)
        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
        : "border-transparent text-[var(--muted)] hover:text-foreground"
    }`;

  const iconButtonClass =
    "p-2 rounded-full text-[var(--muted)] transition-all duration-200 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400";

  const bellIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );

  const searchIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );

  const bell = (
    <span className="relative inline-flex">
      {bellIcon}
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </span>
  );

  const mobileLinkClass = (href: string) =>
    `block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
        : "text-foreground hover:bg-[var(--border)]/30"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md shadow-sm relative">
      <div className="flex w-full px-4 sm:px-6 items-center justify-between gap-4 py-3 h-14">

        {/* LOGO + HAMBURGER */}
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="sm:hidden p-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-foreground transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>

          <Link
            href="/riff"
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-7 w-7" />
            <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              riff
            </span>
          </Link>
        </div>

        {/* CENTER: TABS (desktop) */}
        <div className="hidden sm:flex items-center gap-4 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link href="/" className={tabClass("/")}>
            Latest
          </Link>
          {user && (
            <Link href="/following" className={tabClass("/following")}>
              Following
            </Link>
          )}
        </div>

        {/* RIGHT: SEARCH + ICONS + THEME + USER */}
        <div className="flex items-center gap-1.5 sm:gap-2 z-10">
          <form onSubmit={submitSearch} className="relative hidden md:block">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {searchIcon}
            </span>
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search"
              aria-label="Search"
              className="w-36 lg:w-52 rounded-full border border-[var(--border)] bg-[var(--background)]/50 py-1.5 pl-8 pr-3 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </form>

          <Link href="/search" title="Search" className={`${iconButtonClass} md:hidden`}>
            {searchIcon}
          </Link>

          <Link href="/notifications" title="Notifications" className={iconButtonClass}>
            {bell}
          </Link>

          <Link href="/feedback" className={linkClass("/feedback")}>
            Feedback
            {underline("/feedback")}
          </Link>
          <Link href="/create" className={`${linkClass("/create")} hidden md:inline`}>
            Create
            {underline("/create")}
          </Link>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={iconButtonClass}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          {!user ? (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-foreground px-3 py-2 rounded-md border border-transparent hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200/70 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 dark:hover:border-blue-400/30 transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm hover:shadow-md hover:shadow-blue-500/30 hover:-translate-y-[1px] active:scale-95 active:translate-y-0 transition-all duration-200"
              >
                Signup
              </Link>
            </>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground px-2 py-1.5 rounded-full border border-gray-300 dark:border-slate-700 bg-[var(--surface)] hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm dark:hover:border-blue-400 dark:hover:bg-blue-500/10 transition-all duration-200"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {(user.username || user.email || "?")[0]?.toUpperCase()}
                </span>
                <span className="max-w-[100px] truncate hidden sm:inline">
                  {user.username || user.email?.split('@')[0]}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 text-[var(--muted)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm font-medium text-foreground transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full px-4 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="sm:hidden border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-3 py-3 space-y-1">
          <Link href="/" className={mobileLinkClass("/")}>Latest</Link>
          {user && (
            <Link href="/following" className={mobileLinkClass("/following")}>Following</Link>
          )}
          <Link href="/notifications" className={mobileLinkClass("/notifications")}>
            <span className="flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
          </Link>
          <Link href="/search" className={mobileLinkClass("/search")}>Search</Link>
          <Link href="/feedback" className={mobileLinkClass("/feedback")}>Feedback</Link>
          <Link href="/create" className={mobileLinkClass("/create")}>Create</Link>
          {user && (
            <>
              <Link href="/profile" className={mobileLinkClass("/profile")}>Profile</Link>
              <button
                onClick={logout}
                className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
