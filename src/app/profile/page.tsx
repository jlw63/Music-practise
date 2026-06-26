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
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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
function startDeleting(postId: string) {
  setDeletingPostId(postId);
  setEditingPostId(null); // Closes edit mode if it was open
}
async function confirmDelete(postId: string) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (error) {
    console.error(error);
    alert("Failed to delete post.");
    return;
  }

  setPosts(posts.filter((post) => post.id !== postId));
  setDeletingPostId(null);
}
function startEditing(post: Post) {
  setEditingPostId(post.id);
  setEditTitle(post.title);
  setEditContent(post.content);
}
async function saveEdit(postId: string) {
  const { error } = await supabase
    .from("posts")
    .update({
      title: editTitle,
      content: editContent,
    })
    .eq("id", postId);

  if (error) {
    console.error(error);
    alert("Failed to update post.");
    return;
  }

  setPosts((prev) =>
    prev.map((post) =>
      post.id === postId
        ? {
            ...post,
            title: editTitle,
            content: editContent,
          }
        : post
    )
  );

  setEditingPostId(null);
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
              {editingPostId === post.id ? (
                <>
                  <input
                    className="border p-2 rounded w-full mb-2"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />

                  <textarea
                    className="border p-2 rounded w-full h-24"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold">{post.title}</h3>
                  <p className="mt-2">{post.content}</p>
                </>
              )}

              <p className="text-sm text-gray-400 mt-3">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            <div className="flex gap-2 mt-3">
              {editingPostId === post.id ? (
                <>
                  <button
                    className="bg-green-600 px-3 py-2 rounded text-white"
                    onClick={() => saveEdit(post.id)}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-600 px-3 py-2 rounded text-white"
                    onClick={() => setEditingPostId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : deletingPostId === post.id ? (
                /* This inline banner replaces the window.confirm browser popup */
                <div className="bg-red-950/40 border border-red-800 p-2 rounded flex items-center gap-3 w-full justify-between">
                  <span className="text-sm text-red-200">Are you sure you want to delete this?</span>
                  <div className="flex gap-2">
                    <button
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm text-white font-medium"
                      onClick={() => confirmDelete(post.id)}
                    >
                      Yes, Delete
                    </button>
                    <button
                      className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm text-white"
                      onClick={() => setDeletingPostId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white"
                    onClick={() => startEditing(post)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white"
                    onClick={() => startDeleting(post.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}