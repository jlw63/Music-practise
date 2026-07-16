"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PostType = "video" | "discussion" | "feedback";
type VisibilityOption = "show" | "anonymous";
type StatusOption = "wip" | "finished";

const POST_TYPES: { value: PostType; label: string; icon: string }[] = [
    { value: "video", label: "Video", icon: "🎥" },
    { value: "discussion", label: "Discussion", icon: "💬" },
    { value: "feedback", label: "Feedback", icon: "📝" },
];

export default function CreatePage() {
    const { user, loading } = useAuth();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [description, setDescription] = useState("");
    const [postType, setPostType] = useState<PostType>("video");
    const [videoUrl, setVideoUrl] = useState("");
    const [visibility, setVisibility] = useState<VisibilityOption>("show");
    const [genre, setGenre] = useState("");
    const [instruments, setInstruments] = useState("");
    const [status, setStatus] = useState<StatusOption>("finished");
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
                <p className="text-sm text-[var(--muted)]">Loading...</p>
            </div>
        );
    }
    if (!user) return null;

    function convertToEmbedUrl(url: string) {
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
        if (!videoIdMatch) return url;
        const videoId = videoIdMatch[1];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    const fieldClass =
        "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)]/70 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

    const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]";

    return (
        <div className="min-h-screen bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
            <div className="mx-auto max-w-xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/95 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">

                {/* Header */}
                <div className="mb-8 flex items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                            Create Post
                        </h1>
                        <p className="mt-1.5 text-sm text-[var(--muted)]">
                            Share a video, discussion, or feedback post on riff.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className={labelClass}>Title</label>
                        <input
                            className={fieldClass}
                            placeholder="Give your post a title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Type Toggles */}
                    <div>
                        <label className={labelClass}>Post type</label>
                        <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-1.5">
                            {POST_TYPES.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setPostType(option.value)}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                        postType === option.value
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                            : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-blue-500/10"
                                    }`}
                                >
                                    <span aria-hidden>{option.icon}</span>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Genre, instruments, status */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Genre <span className="normal-case font-normal text-[var(--muted)]/70">(optional)</span></label>
                            <input
                                className={fieldClass}
                                placeholder="Jazz, Lo-fi, Metal..."
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Instruments <span className="normal-case font-normal text-[var(--muted)]/70">(optional)</span></label>
                            <input
                                className={fieldClass}
                                placeholder="Guitar, Piano, Drums"
                                value={instruments}
                                onChange={(e) => setInstruments(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <p className={labelClass}>Status</p>
                        <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-1.5">
                            {([
                                { value: "finished" as StatusOption, label: "Finished" },
                                { value: "wip" as StatusOption, label: "Work in progress" },
                            ]).map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setStatus(option.value)}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                        status === option.value
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                            : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-blue-500/10"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional Video URL */}
                    {(postType === "video" || postType === "feedback") && (
                        <div>
                            <label className={labelClass}>Video URL {postType === "feedback" && <span className="normal-case font-normal text-[var(--muted)]/70">(optional)</span>}</label>
                            <input
                                className={fieldClass}
                                placeholder="Paste a YouTube link"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                            />
                            <p className="mt-1.5 text-xs text-[var(--muted)]">
                                riff embeds YouTube videos only — upload your video to{" "}
                                <a
                                    href="https://www.youtube.com/upload"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:text-blue-500 dark:text-blue-400"
                                >
                                    YouTube
                                </a>{" "}
                                first, then paste the link here.
                            </p>
                        </div>
                    )}

                    {/* Feedback Options */}
                    {postType === "feedback" && (
                        <div className="space-y-4 border-t border-[var(--border)] pt-5">
                            <div>
                                <p className={labelClass}>Visibility</p>
                                <div className="flex flex-wrap gap-2">
                                    {([
                                        { value: "show" as VisibilityOption, label: "Show username" },
                                        { value: "anonymous" as VisibilityOption, label: "Post anonymously" },
                                    ]).map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setVisibility(option.value)}
                                            className={`rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                                                visibility === option.value
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : "text-[var(--muted)] bg-[var(--border)]/20 hover:text-[var(--foreground)] hover:bg-blue-500/10"
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Description</label>
                                <textarea
                                    className={`${fieldClass} min-h-[140px] resize-none`}
                                    placeholder="What kind of feedback are you looking for?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Normal Content */}
                    {postType !== "feedback" && (
                        <div>
                            <label className={labelClass}>Content</label>
                            <textarea
                                className={`${fieldClass} min-h-[140px] resize-none`}
                                placeholder={postType === "discussion" ? "What's on your mind?" : "Add some context for your video"}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-[1px] active:scale-[0.99] active:translate-y-0"
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

                                const parsedInstruments = instruments
                                    .split(",")
                                    .map((i) => i.trim())
                                    .filter(Boolean);

                                const newPost: Record<string, unknown> = {
                                    title,
                                    content: postType === "feedback" ? description : content,
                                    type: postType,
                                    video_url: normalizedVideoUrl,
                                    author_id: user.id,
                                    is_anonymous: postType === "feedback" ? visibility === "anonymous" : false,
                                    genre: genre.trim() || null,
                                    instruments: parsedInstruments.length > 0 ? parsedInstruments : null,
                                    status,
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
                                setGenre("");
                                setInstruments("");
                                setStatus("finished");
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
        </div>
    );
}