"use client";

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


type Props = {
  post: Post;
};


export default function PostCard({post}: Props){

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
height="400"
src={post.video_url}
allowFullScreen
/>

)}


</div>

)

}