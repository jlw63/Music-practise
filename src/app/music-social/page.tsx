import Link from "next/link";

export default function MusicSocialPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-foreground">Welcome to MusicSocial</h1>
        <p className="mt-4 text-muted">
          MusicSocial is a community for musicians to share performances, get feedback, and connect with other players.
        </p>

        <div className="mt-6 space-y-4 text-foreground">
          <div>
            <h2 className="text-xl font-semibold">What we do</h2>
            <p className="mt-2 text-muted">
              Share videos, discuss ideas, and ask for constructive feedback from the community.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">How it works</h2>
            <p className="mt-2 text-muted">
              Upload your performance, label it as feedback or discussion, and let other members comment and rate your work.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Get started</h2>
            <p className="mt-2 text-muted">
              Use the navigation bar to explore the latest posts, join conversations, and open the create screen to post your own music content.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/" className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            View latest posts
          </Link>
          <Link href="/create" className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-foreground hover:bg-[var(--foreground)]/10 transition">
            Create a post
          </Link>
        </div>
      </div>
    </div>
  );
}
