"use client";

import { useAuth } from "@/context/AuthContext";
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
  profiles?: {
    username: string;
  }[];
};


type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: {
    username: string;
  }[];
};


type Props = {
  post: Post;
};


export default function PostCard({post}: Props){

const {user} = useAuth();

const [authorUsername, setAuthorUsername] = useState<string | null>(
  post.profiles?.[0]?.username || null
);

useEffect(() => {
  if (authorUsername) return;
  async function fetchAuthor() {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", post.author_id)
      .single();

    if (data?.username) setAuthorUsername(data.username);
  }

  fetchAuthor();
}, [post.author_id, authorUsername]);


const [likes,setLikes] = useState({
  count:0,
  liked:false
});


const [comments,setComments] = useState<Comment[]>([]);

const [newComment,setNewComment] = useState("");

const [editingCommentId,setEditingCommentId] = useState<string | null>(null);

const [editComment,setEditComment] = useState("");

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
    profiles: c.profiles && c.profiles.length > 0
      ? c.profiles
      : [{ username: profileMap[c.author_id] || "Unknown" }],
  }));
}

async function saveComment(commentId: string){

const { error } = await supabase
.from("comments")
.update({
  content: editComment
})
.eq("id", commentId);

if(error){
  console.log(error);
  return;
}

setComments(prev =>
  prev.map(comment =>
    comment.id === commentId
      ? {
          ...comment,
          content: editComment
        }
      : comment
  )
);

setEditingCommentId(null);

}

async function deleteComment(commentId:string){

const { error } = await supabase
.from("comments")
.delete()
.eq("id", commentId);

if(error){
  console.log(error);
  return;
}

setComments(prev =>
  prev.filter(comment => comment.id !== commentId)
);

}


useEffect(()=>{


async function fetchData(){


const {data:likesData}= await supabase
.from("likes")
.select("user_id")
.eq("post_id",post.id);



let liked = false;


likesData?.forEach((like)=>{

if(user && like.user_id === user.id){
liked=true;
}

});


setLikes({
count: likesData?.length || 0,
liked
});



const {data:commentsData}= await supabase
.from("comments")
.select(`
id,
content,
created_at,
author_id,
  profiles!comments_author_id_fkey(username)
`)
.eq("post_id",post.id)
.order("created_at",{ascending:true});

const resolvedComments = await fillCommentUsernames(commentsData || []);
setComments(resolvedComments || []);


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


setLikes(prev=>({
count:prev.count-1,
liked:false
}));


}
else{


const { error: likeError } = await supabase
  .from("likes")
  .insert({
    post_id: post.id,
    user_id: user.id,
  });

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


setLikes(prev=>({
count:prev.count+1,
liked:true
}));


}

}

async function handleComment(){


if(!user){
alert("Login first");
return;
}


const { error: commentError } = await supabase
  .from("comments")
  .insert({
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



const {data}=await supabase
.from("comments")
.select(`
id,
content,
created_at,
author_id,
profiles!comments_author_id_fkey(username)
`)
.eq("post_id",post.id)
.order("created_at",{ascending:true});

const resolved = await fillCommentUsernames(data || []);
setComments(resolved || []);


}





return (

<div className="border rounded p-4 mb-4" style={{ borderColor: 'var(--border)' }}>


<Link href={`/profile/${post.author_id}`}>
  <h1 className="text-lg font-semibold hover:underline cursor-pointer">
    {authorUsername ?? "Unknown"}
  </h1>
</Link>

<p className="text-sm text-gray-400">
{new Date(post.created_at).toLocaleDateString()}
</p>


<h2 className="text-xl font-bold mt-2">
{post.title}
</h2>


<p>
{post.content}
</p>



{post.type==="video" && post.video_url && (

<iframe
className="mt-4 rounded"
width="100%"
height="515"
src={post.video_url}
allowFullScreen
/>

)}



<button
className={
likes.liked
?
"bg-red-500 text-white px-4 py-2 rounded mt-4"
:
"bg-gray-800 text-white px-4 py-2 rounded mt-4"
}

onClick={handleLike}

>

{likes.liked ? "♥" : "♡"}

{" "}

{likes.count}

</button>




<h3 className="font-semibold mt-6">
Comments
</h3>

{comments.map(comment=>(

<div
key={comment.id}
className="bg-surface text-foreground p-3 rounded mt-2 border"
style={{ borderColor: 'var(--border)' }}
>

<p className="font-medium text-foreground">
{comment.profiles?.[0]?.username ?? "Unknown"}
</p>


{editingCommentId === comment.id ? (

<div>
  <input
    className="border p-2 rounded w-full mt-2 bg-surface text-foreground"
    value={editComment}
    onChange={(e) => setEditComment(e.target.value)}
  />


<button

className="bg-green-600 text-white px-3 py-1 rounded mt-2 mr-2"

onClick={()=>saveComment(comment.id)}

>
Save
</button>


<button

className="bg-gray-600 text-white px-3 py-1 rounded mt-2"

onClick={()=>setEditingCommentId(null)}

>
Cancel
</button>


</div>


 ) : (

  <>

    <p className="text-foreground">{comment.content}</p>


{user?.id === comment.author_id && (

<div className="mt-2">


<button

className="bg-blue-600 text-white px-2 py-1 rounded mr-2"

onClick={()=>{

setEditingCommentId(comment.id);

setEditComment(comment.content);

}}

>
Edit
</button>


<button

className="bg-red-600 text-white px-2 py-1 rounded"

onClick={()=>deleteComment(comment.id)}

>
Delete
</button>


</div>

)}


</>

)}


</div>


))}



<input

className="border p-2 rounded w-full mt-4 bg-surface text-foreground"

value={newComment}

onChange={(e)=>setNewComment(e.target.value)}

placeholder="Join discussion..." />



<button

className="bg-blue-500 text-white px-4 py-2 rounded mt-2"

onClick={handleComment}

>

Send

</button>



</div>

)


}