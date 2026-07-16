"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PostCard from "@/app/components/PostCards";
import { useAuth } from "@/context/AuthContext";
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

export default function UserProfilePage() {
  const params = useParams();
  const { user } = useAuth();

  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [following, setFollowing] = useState(false);
  const [followerList, setFollowerList] = useState<ListUser[]>([]);
  const [followingList, setFollowingList] = useState<ListUser[]>([]);
  const [showList, setShowList] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.log(error);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: postsData, error: postsError } = await supabase
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
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.log(postsError);
      }

      setPosts(postsData || []);

      // check if current user follows this profile
      if (user) {
        const { data: followData } = await supabase
          .from("followers")
          .select("*")
          .eq("following_id", userId)
          .eq("follower_id", user.id)
          .single();

        setFollowing(!!followData);
      }

      // get followers
      const { data: followerUsers, error: followerError } = await supabase
        .from("followers")
        .select(`
          follower_id,
          profiles!followers_follower_id_fkey(id, username)
        `)
        .eq("following_id", userId);

      if (followerError) {
        console.log(followerError);
      }

      setFollowerList(
        followerUsers?.map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
        })) || []
      );

      // get following
      const { data: followingUsers, error: followingError } = await supabase
        .from("followers")
        .select(`
          following_id,
          profiles!followers_following_id_fkey(id, username)
        `)
        .eq("follower_id", userId);

      if (followingError) {
        console.log(followingError);
      }

      setFollowingList(
        followingUsers?.map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
        })) || []
      );

      setLoading(false);
    }

    fetchUser();
  }, [userId, user]);

  async function handleFollow() {
    if (!user) {
      alert("Login first");
      return;
    }

    if (following) {
      const { error: deleteError } = await supabase
        .from("followers")
        .delete()
        .eq("following_id", userId)
        .eq("follower_id", user.id);

      if (deleteError) {
        console.log(deleteError);
        return;
      }

      setFollowing(false);
      setFollowerList((prev) => prev.filter((f) => f.id !== user.id));
    } else {
      const { error } = await supabase.from("followers").insert({
        follower_id: user.id,
        following_id: userId,
      });

      if (error) {
        console.log(error);
        return;
      }

      const { error: notificationError } = await supabase.from("notifications").insert({
        receiver_id: userId,
        sender_id: user.id,
        type: "follow",
      });

      if (notificationError) {
        console.log(notificationError);
      }

      setFollowing(true);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      setFollowerList((prev) => [
        ...prev,
        { id: user.id, username: myProfile?.username || "You" },
      ]);
    }
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

  if (loading) {
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

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center">
          <p className="text-3xl">🤷</p>
          <p className="mt-3 font-semibold text-[var(--foreground)]">User not found</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            This profile doesn&apos;t exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Profile header */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-blue-600 text-2xl font-bold text-white">
                {profile.username?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {profile.username}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)]">
                <span className="font-bold text-[var(--foreground)]">{posts.length}</span> Posts
              </span>
              {statButton("Followers", followerList.length, "followers")}
              {statButton("Following", followingList.length, "following")}
            </div>
          </div>

          {user?.id !== userId && (
            <button
              onClick={handleFollow}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                following
                  ? "border border-[var(--border)] text-[var(--muted)] hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-500"
                  : "bg-blue-600 text-white shadow-sm hover:shadow-md hover:shadow-blue-600/20"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Bio + instruments */}
        {(profile.bio || (profile.instruments && profile.instruments.length > 0)) && (
          <div className="mt-4">
            {profile.bio && (
              <p className="text-sm leading-relaxed text-[var(--foreground)]/90">{profile.bio}</p>
            )}
            {profile.instruments && profile.instruments.length > 0 && (
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

      {/* Practice activity */}
      <div className="mt-6">
        <PracticeLog userId={userId} editable={false} />
      </div>

      {/* Posts */}
      <h2 className="mt-8 mb-4 text-xl font-bold tracking-tight text-[var(--foreground)]">
        Posts
      </h2>

      {posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center">
          <p className="text-3xl">🎵</p>
          <p className="mt-3 font-semibold text-[var(--foreground)]">No posts yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {profile.username} hasn&apos;t shared anything yet.
          </p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} variant="feed" />
      ))}
    </div>
  );
}
