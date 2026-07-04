"use client"

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogin() {
        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.push("/");
    }

    return (
        <div className="mx-auto mt-16 max-w-md px-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
                {/* Header */}
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    Welcome back
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                    Log in to continue to MusicSocial
                </p>

                {/* Error banner */}
                {error && (
                    <div
                        role="alert"
                        className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
                    >
                        {error}
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-4">
                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        />
                    </div>

                    <button
                        className="mt-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-indigo-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </div>

                <p className="mt-6 text-center text-sm text-[var(--muted)]">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/signup"
                        className="font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
