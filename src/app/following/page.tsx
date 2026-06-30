"use client";


import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect,useState } from "react";
import PostCard from "@/app/components/PostCards";


type Post = {
id:string;
title:string;
content:string;
type:"video"|"discussion";
video_url?:string;
created_at:string;
author_id:string;
profiles:{
username:string;
}[];
};



export default function FollowingPage(){


const {user}=useAuth();


const [posts,setPosts]=useState<Post[]>([]);


useEffect(()=>{


if(!user)return;



async function fetchPosts(){


const {data,error}=await supabase

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

.in(
"author_id",

await getFollowingIds()

)

.order(
"created_at",
{
ascending:false
}

);



if(error){

console.log(error);
return;

}


setPosts(data || []);


}



async function getFollowingIds(){


const {data}=await supabase

.from("followers")

.select("following_id")

.eq(
"follower_id",
user.id
);



return data?.map(
(f)=>f.following_id
) || [];


}



fetchPosts();


},[user]);





return (

<div className="max-w-3xl mx-auto">


<h1 className="text-3xl font-bold mb-5">
Following
</h1>


{posts.length===0 && (

<p>
You are not following anyone yet.
</p>

)}



{posts.map(post=>(

<PostCard

key={post.id}

post={post}

/>

))}



</div>

)


}