"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import PostCard from "@/app/components/PostCards";

type Profile = {
username:string;
};


type Post = {
id:string;
title:string;
content:string;
type:"video"|"discussion";
video_url?:string;
created_at:string;
author_id:string;
profiles?:{
username:string;
}[];
};



export default function ProfilePage(){


const {user}=useAuth();


const [profile,setProfile]=useState<Profile|null>(null);

const [posts,setPosts]=useState<Post[]>([]);


const [editingPostId,setEditingPostId]=useState<string|null>(null);

const [editTitle,setEditTitle]=useState("");

const [editContent,setEditContent]=useState("");

const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);



useEffect(()=>{

if(!user)return;

async function fetchProfile(){

const currentUser = user;


const {data:profileData}=await supabase
.from("profiles")
.select("username")
.eq("id",user!.id)
.single();


setProfile(profileData);



const {data:postsData}=await supabase
.from("posts")
.select(`
id,
title,
content,
type,
video_url,
created_at,
author_id,
profiles!posts_author_id_fkey(username)
`)
.eq("author_id",user!.id)
.order("created_at",{ascending:false});


setPosts(postsData || []);


}


fetchProfile();


},[user]);


async function deletePost(id:string){


const {error} = await supabase
.from("posts")
.delete()
.eq("id",id);



if(error){
console.log(error);
return;
}



setPosts(prev =>
prev.filter(post=>post.id !== id)
);


setDeleteConfirmId(null);

}



async function saveEdit(id:string){


await supabase
.from("posts")
.update({

title:editTitle,

content:editContent

})
.eq("id",id);



setPosts(prev=>prev.map(post=>

post.id===id

?

{
...post,
title:editTitle,
content:editContent
}

:

post


));


setEditingPostId(null);


}





return (

<div className="max-w-3xl mx-auto">


<h1 className="text-3xl font-bold">
{profile?.username}
</h1>


<h2 className="text-2xl mt-6">
My Posts
</h2>



{posts.map(post=>(


<div 
key={post.id}
className=" p-4 mb-4"
>


<PostCard post={post}/>


{editingPostId !== post.id && (

<div>

<button

className="bg-blue-600 text-white px-3 py-2 rounded mr-2"

onClick={()=>{

setEditingPostId(post.id);

setEditTitle(post.title);

setEditContent(post.content);

}}

>

Edit

</button>

{deleteConfirmId === post.id ? (

<div className="flex gap-2">

<button

className="bg-red-700 text-white px-3 py-2 rounded"

onClick={()=>deletePost(post.id)}

>
Confirm Delete
</button>


<button

className="bg-gray-600 text-white px-3 py-2 rounded"

onClick={()=>setDeleteConfirmId(null)}

>
Cancel
</button>

</div>


) : (


<button

className="bg-red-600 text-white px-3 py-2 rounded"

onClick={()=>setDeleteConfirmId(post.id)}

>

Delete

</button>


)}

</div>

)}


{editingPostId===post.id && (

<div>

<input

className="border p-2 w-full"

value={editTitle}

onChange={(e)=>setEditTitle(e.target.value)}

/>


<textarea

className="border p-2 w-full mt-2"

value={editContent}

onChange={(e)=>setEditContent(e.target.value)}

/>


<button

className="bg-green-600 text-white px-3 py-2 mt-2 rounded"

onClick={()=>saveEdit(post.id)}

>

Save

</button>


</div>

)}



</div>


))}



</div>


)


}