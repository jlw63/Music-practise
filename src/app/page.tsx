"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/dist/client/link";

export default function Home() {
  const { user } = useAuth();

  type Post = {
    id: string;
    title: string;
    content: string;
    type: "video" | "discussion";
    video_url?: string;
    created_at?: string;
    profiles?: {
      username: string;
    }[];
  };

  type Comment = {
    id: string;
    content: string;
    created_at: string;
    profiles?: {
      username: string;
    }[];
  };

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [likesByPostId, setLikesByPostId] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [likeProcessing, setLikeProcessing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          type,
          video_url,
          created_at,
          author_id,
          profiles (username)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Failed to load posts");
        setLoading(false);
        return;
      }

      const latestPosts = data || [];
      setPosts(latestPosts);

      const postIds = latestPosts.map((p) => p.id);
      if (postIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select(`
            id,
            content,
            created_at,
            author_id,
            post_id,
            profiles (username)
          `)
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
        } else if (commentsData) {
          const groupedComments: Record<string, any[]> = {};
          commentsData.forEach((comment) => {
            if (!groupedComments[comment.post_id]) {
              groupedComments[comment.post_id] = [];
            }
            groupedComments[comment.post_id].push(comment);
          });
          setComments(groupedComments);
        }

        const { data: likesData, error: likesError } = await supabase
          .from("likes")
          .select("id, post_id, user_id")
          .in("post_id", postIds);

        if (likesError) {
          console.error("Error fetching likes:", likesError);
        } else {
          const groupedLikes: Record<string, { count: number; liked: boolean }> = {};
          (likesData || []).forEach((like) => {
            if (!groupedLikes[like.post_id]) {
              groupedLikes[like.post_id] = { count: 0, liked: false };
            }
            groupedLikes[like.post_id].count += 1;
            if (user && like.user_id === user.id) {
              groupedLikes[like.post_id].liked = true;
            }
          });
          postIds.forEach((postId) => {
            if (!groupedLikes[postId]) {
              groupedLikes[postId] = { count: 0, liked: false };
            }
          });
          setLikesByPostId(groupedLikes);
        }
      } else {
        setComments({});
        setLikesByPostId({});
      }
      setLoading(false);
    }

    fetchPosts();
  }, [user]);

  async function handleLike(postId: string) {
    if (!user) {
      alert("You must be logged in to like posts");
      return;
    }

    const postLike = likesByPostId[postId] || { count: 0, liked: false };
    setLikeProcessing((prev) => ({ ...prev, [postId]: true }));

    try {
      if (postLike.liked) {
        const { error: deleteError } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (deleteError) {
          console.error("Failed to unlike post:", deleteError);
          alert("Failed to unlike post");
          return;
        }

        setLikesByPostId((prev) => ({
          ...prev,
          [postId]: {
            count: Math.max((prev[postId]?.count || 1) - 1, 0),
            liked: false,
          },
        }));
      } else {
        const { error: insertError } = await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: user.id });

        if (insertError) {
          console.error("Failed to like post:", insertError);
          alert("Failed to like post");
          return;
        }

        setLikesByPostId((prev) => ({
          ...prev,
          [postId]: {
            count: (prev[postId]?.count || 0) + 1,
            liked: true,
          },
        }));
      }
    } finally {
      setLikeProcessing((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleComment(postId: string) {
    if (!user) {
      alert("You must be logged in to comment");
      return;
    }

    if (!newComment[postId]?.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: user.id,
      content: newComment[postId]
    });

    if (insertError) {
      console.error("Error posting comment:", insertError);
      alert("Failed to post comment");
      return;
    }

    setNewComment({
      ...newComment,
      [postId]: ""
    });

    // refresh comments for that post
    const { data } = await supabase
    .from("comments")
    .select(`
      id,
      content,
      created_at,
      author_id,
      profiles (
        username
      )
    `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setComments((prev) => ({
      ...prev,
      [postId]: data || []
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 py-8">Loading posts...</div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center text-gray-500 py-8">No posts yet</div>
      )}

      {posts.map((post) => (
        <div className="border rounded p-4" key={post.id}>
          <h1 className="text-lg font-semibold">
            <Link href={`/profile/${post.author_id}`}>
              {post.profiles?.username ?? "Unknown"}
            </Link>
            {post.created_at && (
              <span> • {new Date(post.created_at).toLocaleDateString()}</span>
            )}
          </h1>
          <h2>{post.title}</h2>
          <p>{post.content}</p>


          {post.type === "video" && (
            <iframe
              width="100%"
              height="515"
              src={post.video_url}
              allowFullScreen
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition ${likesByPostId[post.id]?.liked ? "bg-red-500 text-white" : "bg-gray-800 text-gray-100 hover:bg-gray-700"}`}
              onClick={() => handleLike(post.id)}
              disabled={likeProcessing[post.id]}
            >
              <span>{likesByPostId[post.id]?.liked ? "♥" : "♡"}</span>
              <span>{likesByPostId[post.id]?.count || 0} Like{(likesByPostId[post.id]?.count || 0) === 1 ? "" : "s"}</span>
            </button>
            {!user && (
              <span className="text-xs text-gray-400">Login to like posts</span>
            )}
          </div>

          {/* comments */}
          <div className="mt-6">
            <h3 className="font-semibold mb-4">Comments</h3>
            <div className="space-y-4 mb-4">
              {comments[post.id]?.map((comment) => (
                <div key={comment.id} className="bg-gray-900 p-3 rounded border border-gray-800">
                  <div className="flex justify-between items-start">
                              <p className="font-medium text-white">{comment.profiles?.username ?? "Unknown"}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-200 mt-2">{comment.content}</p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <input
                className="border p-2 rounded w-full mb-2 text-sm"
                value={newComment[post.id] || ""}
                onChange={(e) => setNewComment({
                  ...newComment,
                  [post.id]: e.target.value
                })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleComment(post.id);
                  }
                }}
                placeholder="Join the discussion..."
              />

              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
                onClick={() => handleComment(post.id)}
              >
                Send
              </button>
            </div>
          </div>


        </div>
      ))}
    </div>
  );
}