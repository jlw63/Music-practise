"use client"

import {createContext, useContext, useState} from "react";

type Post = {
    title: string;
    content: string;
    type: "video" | "discussion";
    videoUrl?: string;
    username: string;
};

type PostContextType = {
    posts: Post[];
    addPost: (post: Post) => void;
};

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({children}: {children: React.ReactNode}) {
    const [posts, setPosts] = useState<Post[]>([]);

    function addPost(post: Post) {
        setPosts((prev) => [post, ...prev]);
    }

    return (
        <PostContext.Provider value={{posts, addPost}}>
            {children}
        </PostContext.Provider>
    );
    
}
export function usePosts() {
  const context = useContext(PostContext);
  if (!context) {
    throw new Error("usePosts must be used inside PostProvider");
  }
  return context;
}