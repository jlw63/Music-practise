"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";


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

type Props = {
  post: Post;
};


export default function PostCard({post}: Props){


const { user } = useAuth();
const [likes,setLikes] = useState({
  count:0,
  liked:false
});


const [comments,setComments] = useState<Comment[]>([]);


const [newComment,setNewComment] = useState("");
useEffect(()=>{

async function fetchData(){


const {data:likesData}=await supabase
.from("likes")
.select("user_id")
.eq("post_id",post.id);



let count = likesData?.length || 0;

let liked=false;


likesData?.forEach((like)=>{

if(user && like.user_id===user.id){
liked=true;
}

});


setLikes({
count,
liked
});



const {data:commentsData}=await supabase

.from("comments")

.select(`
id,
content,
created_at,
profiles(username)
`)

.eq("post_id",post.id)

.order("created_at",{ascending:true});


setComments(commentsData || []);



}


fetchData();


},[post.id,user]);


async function handleLike(){

if(!user){
alert("Login first");
return;
}


if(likes.liked){

await supabase
.from("likes")
.delete()
.eq("post_id",post.id)
.eq("user_id",user.id);


setLikes({
count:likes.count-1,
liked:false
})


}

else{


await supabase
.from("likes")
.insert({
post_id:post.id,
user_id:user.id
});


setLikes({
count:likes.count+1,
liked:true
})


}


}

async function handleComment(){


if(!user) return;


await supabase
.from("comments")
.insert({
post_id: post.id,
author_id:user.id,
content:newComment
});


setNewComment("");


const {data}=await supabase
.from("comments")
.select(`
id,
content,
created_at,
profiles(username)
`)
.eq("post_id",post.id)
.order("created_at",{ascending:true});


setComments(data || []);

}

return (
<div className="border rounded p-4 mb-4">


<h1 className="text-lg font-semibold">
  {post.profiles?.username ?? "Unknown"}
</h1>


<p className="text-sm text-gray-400">
  {new Date(post.created_at).toLocaleDateString()}
</p>



<h2 className="text-xl font-bold mt-2">
  {post.title}
</h2>


<p className="mt-2">
  {post.content}
</p>



{post.type === "video" && post.video_url && (

<iframe
className="mt-4 rounded"
width="100%"
height="515"
src={post.video_url}
allowFullScreen
/>

)}
<div className="mt-4">

<button
className={
likes.liked
? "bg-red-500 text-white px-4 py-2 rounded"
: "bg-gray-800 text-white px-4 py-2 rounded"
}
onClick={handleLike}
>

{likes.liked ? "♥" : "♡"}

{" "}

{likes.count}

 Like{likes.count !== 1 ? "s":""}

</button>


{!user && (
<p className="text-xs text-gray-400 mt-2">
Login to like posts
</p>
)}

</div>
<div className="mt-6">

<h3 className="font-semibold mb-3">
Comments
</h3>


<div className="space-y-3 border-b pb-6 mb-6">

{comments.map((comment)=>(

<div
key={comment.id}
className="bg-gray-900 p-3 rounded"
>

<p className="font-medium">
{comment.profiles?.username ?? "Unknown"}
</p>

<p>
{comment.content}
</p>

</div>

))}

</div>



<div className="mt-4">


<input

className="border p-2 rounded w-full"

value={newComment}

onChange={(e)=>
setNewComment(e.target.value)
}

placeholder="Join the discussion..."



/>


<button

className="bg-blue-500 text-white px-4 py-2 rounded mt-2"

onClick={handleComment}

>

Send

</button>


</div>


</div>



</div>

)

}
