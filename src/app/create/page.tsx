"use client";
import { useEffect, useState } from "react";
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

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [loading, user, router]);

    if (loading) return <p>Loading...</p>;
    if (!user) return null;

    function convertToEmbedUrl(url: string) {
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
        if (!videoIdMatch) return url;
        const videoId = videoIdMatch[1];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    return (
        // FIXED: Removed bg-white so the global dark background flows uninterrupted.
        // Added transparent bg or let it inherit naturally.
        <div className="min-h-screen bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
            {/* The layout container elements float directly over your theme background */}
            <div className="mx-auto max-w-xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/95 p-8 shadow-[0_15px_45px_rgba(15,23,42,0.12)]">
                <div className="space-y-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Create Post</h1>
                        <p className="mt-2 text-sm text-[var(--muted)]">Share a video, discussion, or feedback post on MusicSocial.</p>
                    </div>
                </div>

                {/* Title Input — Styled to blend into dark backgrounds seamlessly */}
                <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Type Toggles Wrapper */}
                <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 p-1.5">
                    {([
                        { value: "video" as PostType, label: "Video" },
                        { value: "discussion" as PostType, label: "Discussion" },
                        { value: "feedback" as PostType, label: "Feedback" },
                    ]).map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setPostType(option.value)}
                            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${postType === option.value ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/20"}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Optional Video URL Input */}
                {(postType === "video" || postType === "feedback") && (
                    <input
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="Optional video URL"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                    />
                )}

                {/* Feedback Specific Options Wrapper */}
                {postType === "feedback" && (
                    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Visibility</p>
                        <div className="flex flex-wrap gap-2">
                            {([
                                { value: "show" as VisibilityOption, label: "Show username" },
                                { value: "anonymous" as VisibilityOption, label: "Post anonymously" },
                            ]).map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setVisibility(option.value)}
                                    className={`rounded-lg px-4 py-2 text-xs font-medium transition ${visibility === option.value ? "bg-indigo-600 text-white" : "text-[var(--muted)] bg-[var(--border)]/20 hover:text-[var(--foreground)]"}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="min-h-[140px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                            placeholder="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                )}

                {/* Normal Content Area */}
                {postType !== "feedback" && (
                    <textarea
                        className="min-h-[140px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                        placeholder="Content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                )}

                {/* Submit Button */}
                <button
                    className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-[0.99]"
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
        </div>
    );
}