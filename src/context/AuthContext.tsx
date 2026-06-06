"use client";

import {createContext, useContext, useEffect, useState} from "react";
import {supabase} from "@/lib/supabase";
import {User} from "@supabase/supabase-js";

type UserWithProfile = User & { username?: string };

type AuthContextType = {
    user: UserWithProfile | null;
    loading: boolean;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
    const [user, setUser] = useState<UserWithProfile | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchUserWithProfile(authUser: User | null) {
        if (!authUser) {
            setUser(null);
            return;
        }
        
        const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", authUser.id)
            .single();
        
        setUser({ ...authUser, username: profile?.username });
    }

    useEffect(() => {
        //get current session on load
        supabase.auth.getSession().then(({data}) => {
            fetchUserWithProfile(data.session?.user ?? null);
            setLoading(false);
        });

        //2. check for login/logout changes
        const {data: authListener} = supabase.auth.onAuthStateChange((event, session) => {
            fetchUserWithProfile(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    async function logout() {
        await supabase.auth.signOut();
    }
    return (
        <AuthContext.Provider value={{user, loading, logout}}>
            {children}
        </AuthContext.Provider>
    );
}   
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
}