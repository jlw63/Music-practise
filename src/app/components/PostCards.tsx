"use client";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  profiles?: { username: string }[];
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: { username: string }[];
};

type Props = {
  post: Post;
};

export default function PostCard({ post }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [authorUsername, setAuthorUsername] = useState<string | null>(
    post.profiles?.[0]?.username || null
  );

  useEffect(() => {
    if (authorUsername) return;
    async function fetchAuthor() {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", post.author_id)
        .single();

      if (data?.username) setAuthorUsername(data.username);
    }

    fetchAuthor();
  }, [post.author_id, authorUsername]);

  const [likes, setLikes] = useState({ count: 0, liked: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");

  // Fill missing usernames for comments in batch
  async function fillCommentUsernames(commentsArr: any[]) {
    const missingIds = Array.from(
      new Set(
        commentsArr
          .filter((c) => !c.profiles || !c.profiles[0]?.username)
          .map((c) => c.author_id)
      )
    );

    if (missingIds.length === 0) return commentsArr;

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id,username")
      .in("id", missingIds);

    const profileMap: Record<string, string> = {};
    profilesData?.forEach((p: any) => {
      profileMap[p.id] = p.username;
    });

    return commentsArr.map((c) => ({
      ...c,
      profiles:
        c.profiles && c.profiles.length > 0
          ? c.profiles
          : [{ username: profileMap[c.author_id] || "Unknown" }],
    }));
  }

  async function saveComment(commentId: string) {
    const { error } = await supabase
      .from("comments")
      .update({ content: editComment })
      .eq("id", commentId);

    if (error) {
      console.log(error);
      return;
    }

    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, content: editComment } : comment
      )
    );

    setEditingCommentId(null);
  }

  async function deleteComment(commentId: string) {
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .select();

    if (error) {
      toast("Could not delete comment: " + error.message, "error");
      return;
    }

    // RLS can block a delete without returning an error — 0 rows come back
    if (!data || data.length === 0) {
      toast(
        "Comment was not deleted — the 'comments' table is missing a DELETE policy in Supabase.",
        "error"
      );
      return;
    }

    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    toast("Comment deleted", "success");
  }

  useEffect(() => {
    async function fetchData() {
      const { data: likesData } = await supabase
        .from("likes")
        .select("user_id")
        .eq("post_id", post.id);

      let liked = false;
      likesData?.forEach((like) => {
        if (user && like.user_id === user.id) liked = true;
      });

      setLikes({ count: likesData?.length || 0, liked });

      const { data: commentsData } = await supabase
        .from("comments")
        .select(
          `id, content, created_at, author_id, profiles!comments_author_id_fkey(username)`
        )
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      const resolvedComments = await fillCommentUsernames(commentsData || []);
      setComments(resolvedComments || []);
    }

    fetchData();
  }, [post.id, user]);

  async function handleLike() {
    if (!user) {
      toast("Login to like posts", "info");
      return;
    }

    if (likes.liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);

      setLikes((prev) => ({ count: prev.count - 1, liked: false }));
    } else {
      const { error: likeError } = await supabase
        .from("likes")
        .insert({ post_id: post.id, user_id: user.id });

      if (likeError) {
        console.log("Like insert error:", likeError);
        return;
      }

      if (post.author_id !== user.id) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            receiver_id: post.author_id,
            sender_id: user.id,
            type: "like",
            post_id: post.id,
          });

        if (notificationError) {
          console.log("Like notification error:", notificationError);
        }
      }

      setLikes((prev) => ({ count: prev.count + 1, liked: true }));
    }
  }

  async function handleComment() {
    if (!user) {
      toast("Login to join the discussion", "info");
      return;
    }

    if (!newComment.trim()) return;

    const { error: commentError } = await supabase.from("comments").insert({
      post_id: post.id,
      author_id: user.id,
      content: newComment,
    });

    if (commentError) {
      console.log("Comment insert error:", commentError);
      return;
    }

    if (post.author_id !== user.id) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          receiver_id: post.author_id,
          sender_id: user.id,
          type: "comment",
          post_id: post.id,
        });

      if (notificationError) {
        console.log("Comment notification error:", notificationError);
      }
    }

    setNewComment("");

    const { data } = await supabase
      .from("comments")
      .select(
        `id, content, created_at, author_id, profiles!comments_author_id_fkey(username)`
      )
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    const resolved = await fillCommentUsernames(data || []);
    setComments(resolved || []);
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 mb-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Author + date */}
      <div className="flex items-center justify-between">
        <Link
          href={`/profile/${post.author_id}`}
          className="text-base font-semibold text-[var(--foreground)] transition-colors hover:text-blue-600 dark:hover:text-blue-400"
        >
          {authorUsername ?? "Unknown"}
        </Link>
        <p className="text-xs text-[var(--muted)]">
          {new Date(post.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Title + content */}
      <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--foreground)]">
        {post.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]/90">
        {post.content}
      </p>

      {/* Tags: genre, instruments, status */}
      {(post.genre || (post.instruments && post.instruments.length > 0) || post.status === "wip") && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.status === "wip" && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              WIP
            </span>
          )}
          {post.genre && (
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              {post.genre}
            </span>
          )}
          {post.instruments?.map((inst) => (
            <span
              key={inst}
              className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
            >
              {inst}
            </span>
          ))}
        </div>
      )}

      {/* Video */}
      {post.type === "video" && post.video_url && (
        <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-[var(--border)]">
          <iframe className="h-full w-full" src={post.video_url} allowFullScreen />
        </div>
      )}

      {/* Like button */}
      <button
        onClick={handleLike}
        className={`mt-4 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
          likes.liked
            ? "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/15"
            : "bg-[var(--border)]/20 text-[var(--muted)] border border-transparent hover:text-red-500 hover:bg-red-500/5"
        }`}
      >
        <span className={likes.liked ? "" : "opacity-70"}>{likes.liked ? "♥" : "♡"}</span>
        {likes.count}
      </button>

      {/* Comments */}
      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Comments
      </h3>

      <div className="space-y-2">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="border-l-2 border-[var(--border)] pl-3 py-1.5 transition-colors hover:border-blue-400/60"
          >
            <p className="text-sm font-medium text-[var(--foreground)]">
              {comment.profiles?.[0]?.username ?? "Unknown"}
            </p>

            {editingCommentId === comment.id ? (
              <div className="mt-1.5">
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => saveComment(comment.id)}
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCommentId(null)}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--foreground)]/90">{comment.content}</p>

                {user?.id === comment.author_id && (
                  <div className="mt-1 flex gap-3">
                    <button
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditComment(comment.content);
                      }}
                      className="text-xs font-medium text-[var(--muted)] transition hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-xs font-medium text-[var(--muted)] transition hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* New comment */}
      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)]/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Join discussion..."
          onKeyDown={(e) => {
            if (e.key === "Enter") handleComment();
          }}
        />
        <button
          onClick={handleComment}
          disabled={!newComment.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}