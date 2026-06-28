"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import PostCard from "@/app/components/PostCards";


type Profile = {
  username: string;
};


type Post = {
  id: string;
  title: string;
  content: string;
  type: "video" | "discussion";
  author_id: string;
  video_url?: string;
  created_at: string;
};



export default function ProfilePage() {

  const { user } = useAuth();


  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);


  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!user) return;

    const userId = user.id;

    async function fetchProfile(){


      const {data:profileData,error} =
      await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();


      if(error){
        console.log(error);
        return;
      }


      setProfile(profileData);



      const {data:postsData,error:postsError}
      =
      await supabase
      .from("posts")
      .select(`
        id,
        title,
        content,
        type,
        author_id,
        video_url,
        created_at,
        profiles (username)
      `)
      .eq("author_id", userId)
      .order("created_at",{ascending:false});



      if(postsError){
        console.log(postsError);
        return;
      }


      setPosts((postsData as Post[]) || []);


    }


    fetchProfile();


  },[user]);



  if(!user){
    return <p>Please login to view profile</p>
  }



  function startEditing(post:Post){

    setEditingPostId(post.id);

    setEditTitle(post.title);
    setEditContent(post.content);

  }



  async function saveEdit(postId:string){


    const {error} =
    await supabase
    .from("posts")
    .update({
      title:editTitle,
      content:editContent
    })
    .eq("id",postId);



    if(error){
      console.log(error);
      return;
    }



    setPosts(prev =>
      prev.map(post =>
        post.id === postId
        ?
        {
          ...post,
          title:editTitle,
          content:editContent
        }
        :
        post
      )
    );


    setEditingPostId(null);


  }



  async function deletePost(postId:string){


    const {error} =
    await supabase
    .from("posts")
    .delete()
    .eq("id",postId);



    if(error){
      console.log(error);
      return;
    }


    setPosts(prev =>
      prev.filter(post=>post.id !== postId)
    );


  }





return (

<div className="max-w-3xl mx-auto space-y-6">


<h1 className="text-3xl font-bold">
{profile?.username ?? "Loading..."}
</h1>


<p className="text-gray-400">
{user.email}
</p>


<p>
{posts.length} posts
</p>



<h2 className="text-2xl font-semibold">
My Posts
</h2>



{posts.map(post=>(

<div key={post.id}>


<PostCard post={post}/>



{editingPostId === post.id && (

<div className="space-y-2 mt-3">

<input
className="border p-2 w-full"
value={editTitle}
onChange={(e)=>setEditTitle(e.target.value)}
/>


<textarea
className="border p-2 w-full"
value={editContent}
onChange={(e)=>setEditContent(e.target.value)}
/>


<button
className="bg-green-600 text-white px-3 py-2 rounded"
onClick={()=>saveEdit(post.id)}
>
Save
</button>


</div>

)}



<div className="flex gap-2 mt-3">


<button
className="bg-blue-600 text-white px-3 py-2 rounded"
onClick={()=>startEditing(post)}
>
Edit
</button>



<button
className="bg-red-600 text-white px-3 py-2 rounded"
onClick={()=>deletePost(post.id)}
>
Delete
</button>


</div>



</div>


))}



</div>

)


}