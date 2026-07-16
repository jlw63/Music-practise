"use client"

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmEmailSent, setConfirmEmailSent] = useState(false);
    const router = useRouter();

    async function handleSignup() {
        if (!username.trim()) {
            setError("Please choose a username.");
            return;
        }
        if (!email.trim()) {
            setError("Please enter your email.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError(null);

        // username goes into auth metadata so a DB trigger can create the
        // profile even when email confirmation delays the first session
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username.trim() },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        // no session = email confirmation is enabled; profile creation is
        // handled by the on_auth_user_created trigger once they confirm
        if (!data.session) {
            setConfirmEmailSent(true);
            setLoading(false);
            return;
        }

        const { error: profileError } = await supabase.from("profiles").upsert({
            id: data.user?.id,
            username: username.trim(),
        });

        if (profileError) {
            setError(profileError.message);
            setLoading(false);
            return;
        }

        router.push("/");
    }

    if (confirmEmailSent) {
        return (
            <div className="mx-auto mt-16 max-w-md px-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
                    <p className="text-4xl">📬</p>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                        Check your email
                    </h1>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                        We sent a confirmation link to{" "}
                        <span className="font-semibold text-[var(--foreground)]">{email}</span>.
                        Click it to activate your account, then log in.
                    </p>
                    <Link
                        href="/login"
                        className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95"
                    >
                        Go to login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto mt-16 max-w-md px-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
                {/* Header */}
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    Create your account
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                    Join riff and start sharing your practice
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
                        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                            Username
                        </label>
                        <input
                            id="username"
                            autoComplete="username"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                            placeholder="Your display name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
                            autoComplete="new-password"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                        />
                    </div>

                    <button
                        className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
                        onClick={handleSignup}
                        disabled={loading}
                    >
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </div>

                <p className="mt-6 text-center text-sm text-[var(--muted)]">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
