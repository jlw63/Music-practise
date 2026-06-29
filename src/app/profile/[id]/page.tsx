"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PostCard from "@/app/components/PostCards";

type Profile = {
  username: string;
};


type Post = {
  id: string;
  title: string;
  content: string;
  type: "video" | "discussion";
  video_url?: string;
  created_at: string;
  author_id: string;
  profiles?: {
    username:string;
    };
};


export default function UserProfilePage() {

  const params = useParams();

  const userId = params.id as string;


  const [profile,setProfile] = useState<Profile | null>(null);
  const [posts,setPosts] = useState<Post[]>([]);
const [loading,setLoading] = useState(true);
useEffect(()=>{

  async function fetchUser(){

    const {data: profileData,error} =
    await supabase
    .from("profiles")
    .select("username")
    .eq("id",userId)
    .single();


    if(error){
      console.log(error);
      return;
    }


    setProfile(profileData);



    const {data: postsData,error:postsError}
    =
    await supabase
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
    .eq("author_id",userId)
    .order("created_at",{ascending:false});



    if(postsError){
      console.log(postsError);
      return;
    }


    setPosts(postsData || []);

    setLoading(false);

  }


  fetchUser();


},[userId]);
return (

<div className="max-w-3xl mx-auto">

<h1 className="text-3xl font-bold">
{profile?.username ?? "Loading..."}
</h1>


<h2 className="text-2xl mt-6 mb-4">
Posts
</h2>


{posts.map(post => (
  <PostCard 
    key={post.id}
    post={post}
  />
))}


</div>

)

}