"use client"

import {useState} from "react";
import {supabase} from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    async function handleLogin() {
        const {data, error} = await supabase.auth.signInWithPassword({
            email, password
        })
        if (error) {
            console.log("Error", error.message);
            return;
        }
        console.log("User logged in:", data);
        router.push("/");
    }
    return (
        <div className="flex flex-col gap-4 max-w-md mx-auto">
        <h1>Login</h1>
        <input className="border p-2 rounded"
        placeholder="Email"
        value={email}
        onChange={(e)=> setEmail(e.target.value)}/>

        <input className="border p-2 rounded"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=> setPassword(e.target.value)}
        onKeyDown={(e)=> e.key === "Enter" && handleLogin()}/>

        <button className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition"
        onClick={handleLogin}>
            Login
        </button>
        </div>

    )
        }