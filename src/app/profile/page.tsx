"use client";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PostCard from "@/app/components/PostCards";
import UserList from "@/app/components/UserList";
import PracticeLog from "@/app/components/PracticeLog";

type Profile = {
  username: string;
  bio?: string | null;
  instruments?: string[] | null;
  avatar_url?: string | null;
};

type Post = {
  id: string;
  title: string;
  content: string;
  type: "video" | "discussion";
  video_url?: string;
  created_at: string;
  author_id: string;
  genre?: string | null;
  instruments?: string[] | null;
  status?: "wip" | "finished" | null;
  profiles?: {
    username: string;
  }[];
};

type ListUser = {
  id: string;
  username: string;
};

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [followerList, setFollowerList] = useState<ListUser[]>([]);
  const [followingList, setFollowingList] = useState<ListUser[]>([]);
  const [showList, setShowList] = useState<"followers" | "following" | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editInstruments, setEditInstruments] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // route protection: bounce logged-out visitors to /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          type,
          video_url,
          created_at,
          author_id,
          genre,
          instruments,
          status,
          profiles!posts_author_id_fkey(username)
        `)
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      setPosts(postsData || []);

      const { data: followerUsers } = await supabase
        .from("followers")
        .select(`
          follower_id,
          profiles!followers_follower_id_fkey(id, username)
        `)
        .eq("following_id", user.id);

      setFollowerList(
        followerUsers?.map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
        })) || []
      );

      const { data: followingUsers } = await supabase
        .from("followers")
        .select(`
          following_id,
          profiles!followers_following_id_fkey(id, username)
        `)
        .eq("follower_id", user.id);

      setFollowingList(
        followingUsers?.map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
        })) || []
      );

      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.", "info");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Image must be under 2MB.", "info");
      return;
    }

    setUploadingAvatar(true);

    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast("Upload failed: " + uploadError.message, "error");
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);

    setUploadingAvatar(false);

    if (updateError) {
      toast("Could not save avatar: " + updateError.message, "error");
      return;
    }

    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    toast("Avatar updated!", "success");
  }

  async function saveProfile() {
    if (!user) return;

    setSavingProfile(true);

    const instruments = editInstruments
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("profiles")
      .update({
        bio: editBio.trim() || null,
        instruments: instruments.length > 0 ? instruments : null,
      })
      .eq("id", user.id);

    setSavingProfile(false);

    if (error) {
      toast("Could not save profile: " + error.message, "error");
      return;
    }

    setProfile((prev) =>
      prev ? { ...prev, bio: editBio.trim() || null, instruments } : prev
    );
    setEditingProfile(false);
    toast("Profile updated!", "success");
  }

  async function deletePost(id: string) {
    const { data, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      toast("Could not delete post: " + error.message, "error");
      return;
    }

    // RLS can block a delete without returning an error — 0 rows come back
    if (!data || data.length === 0) {
      toast(
        "Post was not deleted — the 'posts' table is missing a DELETE policy in Supabase.",
        "error"
      );
      return;
    }

    setPosts((prev) => prev.filter((post) => post.id !== id));
    setDeleteConfirmId(null);
    toast("Post deleted", "success");
  }

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from("posts")
      .update({
        title: editTitle,
        content: editContent,
      })
      .eq("id", id);

    if (error) {
      toast("Could not save changes: " + error.message, "error");
      return;
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, title: editTitle, content: editContent } : post
      )
    );

    setEditingPostId(null);
    toast("Post updated", "success");
  }

  const statButton = (label: string, count: number, key: "followers" | "following") => (
    <button
      onClick={() => setShowList(showList === key ? null : key)}
      className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
        showList === key
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "text-[var(--muted)] hover:bg-[var(--border)]/30 hover:text-[var(--foreground)]"
      }`}
    >
      <span className="font-bold text-[var(--foreground)]">{count}</span> {label}
    </button>
  );

  if (authLoading || !user || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4">
        <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--border)]" />
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-[var(--border)]" />
              <div className="h-3 w-56 rounded bg-[var(--border)]/70" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Profile header */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Avatar (click to change) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            title="Change avatar"
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full transition-all hover:ring-2 hover:ring-blue-500/50 disabled:cursor-wait"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-blue-600 text-2xl font-bold text-white">
                {profile?.username?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              {uploadingAvatar ? "..." : "Change"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {profile?.username}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)]">
                <span className="font-bold text-[var(--foreground)]">{posts.length}</span> Posts
              </span>
              {statButton("Followers", followerList.length, "followers")}
              {statButton("Following", followingList.length, "following")}
            </div>
          </div>

          <button
            onClick={() => {
              setEditingProfile((v) => !v);
              setEditBio(profile?.bio || "");
              setEditInstruments((profile?.instruments || []).join(", "));
            }}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition-all hover:border-blue-400/60 hover:text-blue-600 dark:hover:text-blue-400"
          >
            {editingProfile ? "Cancel" : "✏️ Edit profile"}
          </button>
        </div>

        {/* Bio + instruments display */}
        {!editingProfile && (profile?.bio || (profile?.instruments && profile.instruments.length > 0)) && (
          <div className="mt-4">
            {profile?.bio && (
              <p className="text-sm leading-relaxed text-[var(--foreground)]/90">{profile.bio}</p>
            )}
            {profile?.instruments && profile.instruments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.instruments.map((inst) => (
                  <span
                    key={inst}
                    className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
                  >
                    🎵 {inst}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit profile form */}
        {editingProfile && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Bio</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              rows={3}
              maxLength={300}
              placeholder="Tell people about yourself and what you're practising..."
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
            />
            <label className="mb-1.5 mt-3 block text-sm font-medium text-[var(--foreground)]">
              Instruments <span className="font-normal text-[var(--muted)]">(comma-separated)</span>
            </label>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="Guitar, Piano, Drums"
              value={editInstruments}
              onChange={(e) => setEditInstruments(e.target.value)}
            />
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </div>
        )}

        {showList === "followers" && (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Followers
            </h2>
            {followerList.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No followers yet.</p>
            ) : (
              <UserList users={followerList} />
            )}
          </div>
        )}

        {showList === "following" && (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Following
            </h2>
            {followingList.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Not following anyone yet.</p>
            ) : (
              <UserList users={followingList} />
            )}
          </div>
        )}
      </div>

      {/* Practice log */}
      <div className="mt-6">
        <PracticeLog userId={user.id} editable={true} />
      </div>

      {/* Posts */}
      <h2 className="mt-8 mb-4 text-xl font-bold tracking-tight text-[var(--foreground)]">
        My Posts
      </h2>

      {posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center">
          <p className="text-3xl">🎵</p>
          <p className="mt-3 font-semibold text-[var(--foreground)]">No posts yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Share a practice video or start a discussion from the Create page.
          </p>
        </div>
      )}

      {posts.map((post) => (
        <div key={post.id} className="mb-6">
          {/* Owner toolbar */}
          {editingPostId !== post.id && (
            <div className="mb-1.5 flex items-center justify-end gap-1">
              {deleteConfirmId === post.id ? (
                <>
                  <span className="mr-1 text-sm text-[var(--muted)]">Delete this post?</span>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-500 active:scale-95"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingPostId(post.id);
                      setEditTitle(post.title);
                      setEditContent(post.content);
                      setDeleteConfirmId(null);
                    }}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--muted)] transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(post.id)}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    🗑 Delete
                  </button>
                </>
              )}
            </div>
          )}

          {editingPostId === post.id ? (
            <div className="rounded-2xl border border-blue-500/40 bg-[var(--surface)] p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Editing post
              </h3>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm font-semibold text-[var(--foreground)] outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
              />
              <textarea
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                rows={4}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Content"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => saveEdit(post.id)}
                  disabled={!editTitle.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save changes
                </button>
                <button
                  onClick={() => setEditingPostId(null)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <PostCard post={post} />
          )}
        </div>
      ))}
    </div>
  );
}
