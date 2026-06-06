"use client";

import {usePosts} from "./context/PostContext";

export default function Home() {
  const {posts} = usePosts();
  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
    <div className="border rounded p-4" key={post.title}>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
      <p className="text-sm text-gray-400">
        Posted by: {post.username}
      </p>

      {post.type === "video" && (
        <iframe
          width="100%"
          height="515"
          src={post.videoUrl}

          allowFullScreen
        />
      )}
    </div>
       ))}
    </div>
  );
}