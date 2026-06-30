"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import PostCard from "@/app/components/PostCards";

export default function Home() {

  type Post = {
    id: string;
    title: string;
    content: string;
    type: "video" | "discussion";
    video_url?: string;
    created_at: string;
    author_id: string;
    profiles?: {
      username: string;
    }[];
  };


  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);


useEffect(()=>{

async function fetchPosts(){

const {data,error}= await supabase
.from("posts")
.select(`
id,
title,
content,
type,
video_url,
created_at,
author_id,
profiles(username)
`)
.order("created_at",{ascending:false});


if(error){
  console.log(error);
  setLoading(false);
  return;
}

setPosts(data || []);
setLoading(false);

}


fetchPosts();


},[]);
return (
  <div className="max-w-3xl mx-auto space-y-6">

    {loading && (
      <p>Loading...</p>
    )}

    {posts.map(post => (
      <PostCard
        key={post.id}
        post={post}
      />
    ))}

  </div>
);
}