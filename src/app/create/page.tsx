"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PostType = "video" | "discussion" | "feedback";
type VisibilityOption = "show" | "anonymous";

export default function CreatePage() {
    const { user, loading } = useAuth();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [description, setDescription] = useState("");
    const [postType, setPostType] = useState<PostType>("video");
    const [videoUrl, setVideoUrl] = useState("");
    const [visibility, setVisibility] = useState<VisibilityOption>("show");
    const router = useRouter();

    if (loading) return <p>Loading...</p>;
    if (!user) {
        router.push("/");
        return null;
    }

    function convertToEmbedUrl(url: string) {
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
        if (!videoIdMatch) return url;
        const videoId = videoIdMatch[1];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    return (
        <div className="flex flex-col gap-4 max-w-md mx-auto">
            <h1 className="text-2xl font-semibold">Create Post</h1>

            <input
                className="border p-2 rounded"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as PostType)}
                className="bg-black text-white border p-2 rounded focus:outline-none focus:ring-2 focus:ring-white"
            >
                <option value="video">Video</option>
                <option value="discussion">Discussion</option>
                <option value="feedback">Feedback</option>
            </select>

            {postType === "feedback" && (
                <>
                    <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as VisibilityOption)}
                        className="border p-2 rounded"
                    >
                        <option value="show">Show username</option>
                        <option value="anonymous">Post anonymously</option>
                    </select>

                    <textarea
                        className="border p-2 rounded h-32 resize-none"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </>
            )}

            {(postType === "video" || postType === "feedback") && (
                <input
                    className="border p-2 rounded"
                    placeholder="Optional video URL"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                />
            )}

            {postType !== "feedback" && (
                <textarea
                    className="border p-2 rounded h-32 resize-none"
                    placeholder="Content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            )}

            <button
                className="border text-white p-2 rounded hover:bg-white cursor-pointer transition hover:text-black hover:scale-105"
                onClick={async () => {
                    if (!title.trim()) {
                        alert("Please add a title.");
                        return;
                    }

                    if (postType === "feedback" && !description.trim()) {
                        alert("Please add a description for your feedback.");
                        return;
                    }

                    if (postType !== "feedback" && !content.trim()) {
                        alert("Please add some content.");
                        return;
                    }

                    try {
                        const normalizedVideoUrl = (postType === "video" || postType === "feedback") && videoUrl
                            ? convertToEmbedUrl(videoUrl)
                            : undefined;

                        const newPost: Record<string, unknown> = {
                            title,
                            content: postType === "feedback" ? description : content,
                            type: postType,
                            video_url: normalizedVideoUrl,
                            author_id: user.id,
                            is_anonymous: postType === "feedback" ? visibility === "anonymous" : false,
                        };

                        const { error } = await supabase.from("posts").insert(newPost);

                        if (error) {
                            const fallbackPayload = {
                                title,
                                content: postType === "feedback" ? description : content,
                                type: postType,
                                video_url: normalizedVideoUrl,
                                author_id: user.id,
                            };

                            const { error: fallbackError } = await supabase.from("posts").insert(fallbackPayload);
                            if (fallbackError) {
                                console.error("failed to create post", fallbackError);
                                alert("Your post could not be saved right now. Please try again.");
                                return;
                            }
                        }

                        setTitle("");
                        setContent("");
                        setDescription("");
                        setPostType("video");
                        setVideoUrl("");
                        setVisibility("show");
                        router.push(postType === "feedback" ? "/feedback" : "/");
                    } catch (err) {
                        console.error("Unexpected error", err);
                    }
                }}
            >
                Submit
            </button>
        </div>
    );
}