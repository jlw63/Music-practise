"use client"

import {useState} from "react";
import {supabase} from "../../lib/supabase";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleLogin() {
        const {data, error} = await supabase.auth.signInWithPassword({
            email, password
        })
        if (error) {
            console.log("Error", error.message);
            return;
        }
        console.log("User logged in:", data);
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

        <button className="border text-white p-2 rounded hover:bg-white cursor-pointer transition hover:text-black hover:scale-105"
        onClick={handleLogin}>
            Login
        </button>
        </div>

    )
        }