"use client"

import {useState} from "react";
import {supabase} from "../../lib/supabase";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleSignup() {
        const {data, error} = await supabase.auth.signUp({
        email,
        password
        })
        if (error) {
            console.log("Error", error.message);
            return;
        }
        console.log("User created:", data);
    }
    return (
        <div className="flex flex-col gap-4 max-w-md mx-auto">
            <h1>Sign Up</h1>
            <input className="border p-2 rounded"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />

            <input className="border p-2 rounded "
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />

            <button className="border text-white p-2 rounded 
            hover:bg-white cursor-pointer transition hover:text-black hover:scale-105"
                onClick={handleSignup}>
                Sign Up
            </button>
       </div>
    );
}