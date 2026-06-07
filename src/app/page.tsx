"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  type Post = {
    id: string;
    title: string;
    content: string;
    type: "video" | "discussion";
    video_url?: string;
    author_id: string;
  };
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        content,
        type,
        video_url,
        created_at,
        profiles (
          username
        )
      `)
      .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch posts", error);
        return;
      }
      setPosts(data|| []);
    }
    fetchPosts();
    }, []);

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
    <div className="border rounded p-4" key={post.id}>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
      <p className="text-sm text-gray-400">
        Posted by: {post.profiles?.username}
      </p>

      {post.type === "video" && (
        <iframe
          width="100%"
          height="515"
          src={post.video_url}

          allowFullScreen
        />
      )}
    </div>
       ))}
    </div>
  );
}