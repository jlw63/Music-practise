"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  type Post = {
    id: string;
    title: string;
    content: string;
    type: "video" | "discussion";
    video_url?: string;
    profiles?: {
      username: string;
    };
  };

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState("");

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
          profiles (username)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setPosts(data || []);

      for (const post of data || []) {
        const { data: commentsData } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true });

        setComments((prev) => ({
          ...prev,
          [post.id]: commentsData || []
        }));
      }
    }

    fetchPosts();
  }, []);

  async function handleComment(postId: string) {
    if (!user) return;

    await supabase.from("comments").insert({
      post_id: postId,
      author_id: user.id,
      content: newComment
    });

    setNewComment("");

    // refresh comments for that post
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setComments((prev) => ({
      ...prev,
      [postId]: data || []
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <div className="border rounded p-4" key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>

          <p className="text-sm text-gray-400">
            Posted by: {post.profiles?.username ?? "Unknown"}
          </p>

          {/* comments */}
          <div className="mt-4">
            {comments[post.id]?.map((comment) => (
              <p key={comment.id}>
                <b>{comment.author_id}</b>: {comment.content}
              </p>
            ))}

            <input
              className="border p-1 mt-2 w-full"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment"
            />

            <button
              className="border px-2 py-1 mt-1"
              onClick={() => handleComment(post.id)}
            >
              Send
            </button>
          </div>

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