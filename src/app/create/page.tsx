"use client";
import {useState} from "react";




export default function CreatePage() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("video");
    return (<div className="flex flex-col gap-4 max-w-md mx-auto">
            <h1>Create Post</h1>

            <input className="border p-2 rounded "
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            />

            <textarea className="border p-2 rounded h-32 resize-none "
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            />

            <select value={postType} onChange={(e) => setPostType(e.target.value)} className="border p-2 rounded">
                <option value="video">Video</option>
                <option value="discussion">Discussion</option>

            </select>


            <button className="border text-white p-2 rounded hover:bg-white cursor-pointer transition hover:text-black hover:scale-105" 
                onClick={() => {
                    console.log("Title:", title);
                    console.log("Content:", content);
                }}
                >Submit
            </button>




        </div>
    );
}