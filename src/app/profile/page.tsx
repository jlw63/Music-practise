"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type Profile = {
  username: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function ProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      // Fetch username
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setProfile(data);

      // Fetch user's posts
      const { data: userPosts, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          created_at
        `)
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error(postsError);
        return;
      }

      setPosts(userPosts || []);
    }

    fetchProfile();
  }, [user]);

  if (!user) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {profile?.username ?? "Loading..."}
        </h1>

        <p className="text-gray-400">{user.email}</p>

        <p className="mt-2">
          <strong>{posts.length}</strong> post{posts.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">My Posts</h2>

        {posts.length === 0 ? (
          <p>You haven't created any posts yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="border rounded p-4 mb-4">
              <h3 className="text-xl font-semibold">{post.title}</h3>

              <p className="mt-2">{post.content}</p>

              <p className="text-sm text-gray-400 mt-3">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}