"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/dist/client/link";
import PostCard from "@/app/components/PostCards";

export default function Home() {
  const { user } = useAuth();

  type Post = {
    id: string;
    title: string;
    content: string;
    type: "video" | "discussion";
    video_url?: string;
    created_at?: string;
    author_id: string;
    profiles?: {
      username: string;
    };
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

{posts.map(post => (
  <PostCard
    key={post.id}
    post={post}
    user={user}
    comments={comments[post.id] || []}
    likes={likesByPostId[post.id] || {count:0, liked:false}}
    newComment={newComment[post.id] || ""}
    setNewComment={setNewComment}
    handleLike={handleLike}
    handleComment={handleComment}
  />
))}
    </div>
  );
}