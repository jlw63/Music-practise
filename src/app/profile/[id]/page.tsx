"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PostCard from "@/app/components/PostCards";
import { useAuth } from "@/context/AuthContext";
import UserList from "@/app/components/UserList";


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
const {user} = useAuth();

const userId = params.id as string;



const [following,setFollowing] = useState(false);

const [followers,setFollowers] = useState(0);

const [followerList,setFollowerList] = useState<any[]>([]);

const [followingList,setFollowingList] = useState<any[]>([]);

const [showList,setShowList] = useState<
"followers" | "following" | null
>(null);



const [profile,setProfile] = useState<Profile|null>(null);

const [posts,setPosts] = useState<Post[]>([]);

const [loading,setLoading] = useState(true);



useEffect(()=>{


async function fetchUser(){



const {data:profileData,error} =
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





const {data:postsData,error:postsError}
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





// follower count

const {data:followersData}=await supabase
.from("followers")
.select("*")
.eq("following_id",userId);



setFollowers(
followersData?.length || 0
);





// check if current user follows this profile

if(user){


const {data:followData}=await supabase
.from("followers")
.select("*")
.eq("following_id",userId)
.eq("follower_id",user.id)
.single();



setFollowing(!!followData);


}



// get followers
const {data:followerUsers,error:followerError}=await supabase
.from("followers")
.select(`
  follower_id,
  profiles!followers_follower_id_fkey(
    id,
    username
  )
`)
.eq("following_id",userId);


if(followerError){
  console.log(followerError);
}


setFollowerList(
  followerUsers?.map((f:any)=>({
    id:f.profiles.id,
    username:f.profiles.username
  })) || []
);



// get following
const {data:followingUsers,error:followingError}=await supabase
.from("followers")
.select(`
  following_id,
  profiles!followers_following_id_fkey(
    id,
    username
  )
`)
.eq("follower_id",userId);


if(followingError){
 console.log(followingError);
}


setFollowingList(
  followingUsers?.map((f:any)=>({
    id:f.profiles.id,
    username:f.profiles.username
  })) || []
);


setLoading(false);


}



fetchUser();



},[userId,user]);




async function handleFollow(){



if(!user){

alert("Login first");

return;

}




if(following){



await supabase
.from("followers")
.delete()
.eq("following_id",userId)
.eq("follower_id",user.id);



setFollowing(false);


setFollowers(prev=>prev-1);



setFollowerList(prev=>
prev.filter(
(f)=>f.id !== user.id
)
);



}

else{



await supabase
.from("followers")
.insert({

follower_id:user.id,

following_id:userId

});



setFollowing(true);


setFollowers(prev=>prev+1);



setFollowerList(prev=>[

...prev,

{

id:user.id,

username:user.user_metadata.username || "Unknown"

}

]);



}



}





if(loading){

return <p>Loading profile...</p>

}





return (

<div className="max-w-3xl mx-auto">



<h1 className="text-3xl font-bold">

{profile?.username}

</h1>




<div className="flex gap-4 mt-3">



<button

className="underline"

onClick={()=>setShowList("followers")}

>

{followers} Followers

</button>




<button

className="underline"

onClick={()=>setShowList("following")}

>

{followingList.length} Following

</button>



</div>





{user?.id !== userId && (

<button

className="bg-blue-600 text-white px-4 py-2 rounded mt-3"

onClick={handleFollow}

>

{following ? "Following" : "Follow"}

</button>

)}







{showList==="followers" && (

<div className="mt-5">

<h2 className="font-bold mb-3">

Followers

</h2>


<UserList users={followerList}/>


</div>

)}







{showList==="following" && (

<div className="mt-5">


<h2 className="font-bold mb-3">

Following

</h2>



<UserList users={followingList}/>



</div>

)}






<h2 className="text-2xl mt-6 mb-4">

Posts

</h2>





{posts.map(post=>(

<PostCard

key={post.id}

post={post}

/>

))}




</div>

)

}