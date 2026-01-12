"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@iconify/react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const redirectTo = searchParams.get("redirect") || "/";

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
                },
            });
            if (error) throw error;
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Google login failed", "error");
            setGoogleLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            showToast("Welcome back!", "success");
            router.push(redirectTo);
            router.refresh();
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Login failed", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 bg-background">
            {/* Background Glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

            <Card variant="glass" className="w-full max-w-md relative z-10">
                <CardHeader className="text-center space-y-4">
                    {/* Logo */}
                    <Link href="/" className="inline-flex justify-center">
                        <img src="/logo.svg" alt="SquirrAI" className="w-14 h-14 rounded-2xl shadow-lg shadow-primary/30" />
                    </Link>

                    <div>
                        <CardTitle className="text-2xl">Welcome back</CardTitle>
                        <CardDescription className="mt-2">
                            Sign in to continue creating
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Email</label>
                            <div className="relative">
                                <Icon icon="mingcute:mail-fill" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full h-12 pl-11 pr-4 bg-surface-2 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Password</label>
                            <div className="relative">
                                <Icon icon="mingcute:lock-fill" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full h-12 pl-11 pr-12 bg-surface-2 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <Icon icon={showPassword ? "mingcute:eye-close-fill" : "mingcute:eye-fill"} className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password */}
                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full h-12"
                            loading={loading}
                            disabled={loading}
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                        </div>
                    </div>

                    {/* Google OAuth */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 gap-3"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                    >
                        {googleLoading ? (
                            <Icon icon="mingcute:loading-fill" className="w-5 h-5 animate-spin" />
                        ) : (
                            <Icon icon="flat-color-icons:google" className="w-5 h-5" />
                        )}
                        Continue with Google
                    </Button>

                    {/* Register Link */}
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function LoginFallback() {
    return (
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 bg-background">
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
            <Card variant="glass" className="w-full max-w-md relative z-10 flex items-center justify-center py-20">
                <Icon icon="mingcute:loading-fill" className="w-8 h-8 animate-spin text-primary" />
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginFallback />}>
            <LoginForm />
        </Suspense>
    );
}
