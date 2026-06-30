"use client";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";


type Notification = {
  id:string;
  type:string;
  created_at:string;
  sender:{
    username:string;
  };
};


export default function NotificationsPage(){


const {user}=useAuth();


const [notifications,setNotifications]=useState<Notification[]>([]);
const [loading,setLoading]=useState(true);



useEffect(()=>{


if(!user)return;



async function fetchNotifications(){



const {data,error}=await supabase

.from("notifications")

.select(`
id,
type,
created_at,
sender_id,
profiles!notifications_sender_id_fkey(
  username
)

`)

.eq(
"receiver_id",
user.id
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



const formatted = data?.map((n:any)=>({

id:n.id,

type:n.type,

created_at:n.created_at,

sender:n.profiles


})) || [];



setNotifications(formatted);

setLoading(false);



}



fetchNotifications();



},[user]);




if(loading){

return <p>Loading...</p>

}




return (

<div className="max-w-3xl mx-auto">


<h1 className="text-3xl font-bold mb-5">

Notifications

</h1>




{notifications.length===0 && (

<p>
No notifications yet
</p>

)}




<div className="space-y-3">


{notifications.map(notification=>(



<div

key={notification.id}

className="border p-4 rounded"

>



<Link
href="#"
className="font-semibold hover:underline"
>

{notification.sender.username}

</Link>




{" "}


{notification.type==="follow" && (

<span>
followed you
</span>

)}



{notification.type==="like" && (

<span>
liked your post
</span>

)}



{notification.type==="comment" && (

<span>
commented on your post
</span>

)}





<p className="text-sm text-gray-400 mt-1">

{new Date(
notification.created_at
).toLocaleDateString()}

</p>



</div>



))}


</div>



</div>

)


}