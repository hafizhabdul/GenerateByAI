"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch profile - non-blocking, with error handling
    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                console.error("Profile fetch error:", error);
                return null;
            }
            return data;
        } catch (err) {
            console.error("Profile fetch exception:", err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (user) {
            const data = await fetchProfile(user.id);
            if (data) setProfile(data);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Get initial session
                const { data: { session } } = await supabase.auth.getSession();

                if (!mounted) return;

                if (session?.user) {
                    setUser(session.user);
                    // Fetch profile in background, don't block loading
                    fetchProfile(session.user.id).then(data => {
                        if (mounted && data) setProfile(data);
                    });
                }
            } catch (err) {
                console.error("Auth init error:", err);
            } finally {
                // Always stop loading after 1 second max
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                console.log("Auth event:", event);

                if (session?.user) {
                    setUser(session.user);
                    // Fetch profile in background
                    fetchProfile(session.user.id).then(data => {
                        if (mounted && data) setProfile(data);
                    });
                } else {
                    setUser(null);
                    setProfile(null);
                }

                // Always set loading to false after auth change
                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}
