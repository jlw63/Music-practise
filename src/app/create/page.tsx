"use client";
import {useState} from "react";
import {useAuth} from "@/context/AuthContext";
import {useRouter} from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CreatePage() {
    const {user, loading} = useAuth();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState<"video" | "discussion">("video");
    const [videoUrl, setVideoUrl] = useState("");
    const router = useRouter();
    if (loading) return <p>Loading...</p>;
    if (!user) {
        router.push("/login");
        return null;
    }
function convertToEmbedUrl(url: string) {
  const videoIdMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/
  );

  if (!videoIdMatch) return url; // fallback if not YouTube

  const videoId = videoIdMatch[1];
  return `https://www.youtube.com/embed/${videoId}`;
}

    return (<div className="flex flex-col gap-4 max-w-md mx-auto">
            <h1>Create Post</h1>

            <input className="border p-2 rounded "
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            />
            <select value={postType} onChange={(e) => setPostType(e.target.value as "video" | "discussion")} className="bg-black text-white border p-2 rounded focus:outline-none focus:ring-2 focus:ring-white">
                <option value="video">Video</option>
                <option value="discussion">Discussion</option>

            </select>

            {postType === "video" && (
                <input className="border p-2 rounded "
                placeholder="Video URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                />
            )}
            

            <textarea className="border p-2 rounded h-32 resize-none "
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            />



            <button className="border text-white p-2 rounded hover:bg-white cursor-pointer transition hover:text-black hover:scale-105" 
                onClick={async() => {
                    try {
                        const newPost = {
                            title,
                            content,
                            type: postType,
                            video_url: postType === "video" ? convertToEmbedUrl(videoUrl) : undefined,
                            author_id: user.id,
                        };

                        const {error} = await supabase.from("posts").insert(newPost);

                        if (error) {
                            console.error("failed to create post", error);
                            return;
                        }
                        
                        setTitle("");
                        setContent("");
                        setPostType("video");
                        setVideoUrl("");
                        router.push("/");
                    } catch (err) {
                        console.error("Unexpected error", err);
                    }
                }}
                >Submit
            </button>
        </div>
    );
}