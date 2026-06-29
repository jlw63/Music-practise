"use client";

import Link from "next/link";

type User = {
  id:string;
  username:string;
};


type Props = {
  users:User[];
};


export default function UserList({users}:Props){


return (

<div className="space-y-3">


{users.map(user=>(


<Link
key={user.id}
href={`/profile/${user.id}`}
>

<div className="border p-3 rounded hover:bg-gray-800">

{user.username}

</div>


</Link>


))}


</div>


)

}