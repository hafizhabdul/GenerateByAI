"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface ShareButtonProps {
    url?: string;
    title?: string;
    text?: string;
    imageUrl?: string;
    prompt?: string;
    className?: string;
    variant?: "icon" | "button" | "dropdown";
}

/**
 * Share Button Component
 * Supports Web Share API, copy link, and social media sharing
 */
export function ShareButton({
    url,
    title = "Check out my AI creation on SQUIRR.AI!",
    text,
    imageUrl,
    prompt,
    className,
    variant = "icon",
}: ShareButtonProps) {
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    // Generate share URL (current page if not provided)
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const shareText = text || prompt || title;

    // Check if Web Share API is available
    const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

    // Copy link to clipboard
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast("Link berhasil disalin!", "success");
            setIsOpen(false);
        } catch {
            showToast("Gagal menyalin link", "error");
        }
    };

    // Copy prompt to clipboard
    const handleCopyPrompt = async () => {
        if (!prompt) return;
        try {
            await navigator.clipboard.writeText(prompt);
            showToast("Prompt berhasil disalin!", "success");
            setIsOpen(false);
        } catch {
            showToast("Gagal menyalin prompt", "error");
        }
    };

    // Native share (mobile)
    const handleNativeShare = async () => {
        if (!canNativeShare) return;

        try {
            await navigator.share({
                title,
                text: shareText,
                url: shareUrl,
            });
            setIsOpen(false);
        } catch (err) {
            // User cancelled or error
            if ((err as Error).name !== "AbortError") {
                console.error("Share failed:", err);
            }
        }
    };

    // Social media share URLs
    const socialLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
        pinterest: imageUrl
            ? `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(shareText)}`
            : undefined,
    };

    const handleSocialShare = (platform: keyof typeof socialLinks) => {
        const link = socialLinks[platform];
        if (link) {
            window.open(link, "_blank", "width=600,height=400");
            setIsOpen(false);
        }
    };

    // Icon-only variant
    if (variant === "icon") {
        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => canNativeShare ? handleNativeShare() : setIsOpen(!isOpen)}
                    className={cn(
                        "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors",
                        className
                    )}
                    title="Share"
                >
                    <Icon icon="mingcute:share-2-line" className="w-4 h-4" />
                </button>

                {/* Dropdown */}
                {isOpen && !canNativeShare && (
                    <ShareDropdown
                        onClose={() => setIsOpen(false)}
                        onCopyLink={handleCopyLink}
                        onCopyPrompt={prompt ? handleCopyPrompt : undefined}
                        onSocialShare={handleSocialShare}
                        socialLinks={socialLinks}
                    />
                )}
            </div>
        );
    }

    // Button variant
    if (variant === "button") {
        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => canNativeShare ? handleNativeShare() : setIsOpen(!isOpen)}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
                        "bg-surface-2 text-foreground rounded-lg",
                        "hover:bg-surface-3 transition-colors",
                        className
                    )}
                >
                    <Icon icon="mingcute:share-2-line" className="w-3.5 h-3.5" />
                    Share
                </button>

                {/* Dropdown */}
                {isOpen && !canNativeShare && (
                    <ShareDropdown
                        onClose={() => setIsOpen(false)}
                        onCopyLink={handleCopyLink}
                        onCopyPrompt={prompt ? handleCopyPrompt : undefined}
                        onSocialShare={handleSocialShare}
                        socialLinks={socialLinks}
                    />
                )}
            </div>
        );
    }

    // Dropdown variant (always show dropdown)
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
                    "bg-surface-2 text-foreground rounded-lg",
                    "hover:bg-surface-3 transition-colors",
                    className
                )}
            >
                <Icon icon="mingcute:share-2-line" className="w-3.5 h-3.5" />
                Share
                <Icon icon="mingcute:down-line" className="w-3 h-3" />
            </button>

            {isOpen && (
                <ShareDropdown
                    onClose={() => setIsOpen(false)}
                    onCopyLink={handleCopyLink}
                    onCopyPrompt={prompt ? handleCopyPrompt : undefined}
                    onSocialShare={handleSocialShare}
                    socialLinks={socialLinks}
                />
            )}
        </div>
    );
}

// Dropdown component
function ShareDropdown({
    onClose,
    onCopyLink,
    onCopyPrompt,
    onSocialShare,
    socialLinks,
}: {
    onClose: () => void;
    onCopyLink: () => void;
    onCopyPrompt?: () => void;
    onSocialShare: (platform: "twitter" | "facebook" | "whatsapp" | "telegram" | "pinterest") => void;
    socialLinks: Record<string, string | undefined>;
}) {
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}
            />

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-surface-1 border border-border rounded-xl shadow-lg overflow-hidden animate-scale-in">
                <div className="p-1">
                    {/* Copy Link */}
                    <button
                        onClick={onCopyLink}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                    >
                        <Icon icon="mingcute:link-2-line" className="w-4 h-4 text-muted-foreground" />
                        Salin Link
                    </button>

                    {/* Copy Prompt */}
                    {onCopyPrompt && (
                        <button
                            onClick={onCopyPrompt}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                        >
                            <Icon icon="mingcute:copy-2-line" className="w-4 h-4 text-muted-foreground" />
                            Salin Prompt
                        </button>
                    )}

                    <div className="h-px bg-border my-1" />

                    {/* Social Media */}
                    <button
                        onClick={() => onSocialShare("twitter")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                    >
                        <Icon icon="mingcute:social-x-line" className="w-4 h-4 text-muted-foreground" />
                        Twitter / X
                    </button>

                    <button
                        onClick={() => onSocialShare("facebook")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                    >
                        <Icon icon="mingcute:facebook-line" className="w-4 h-4 text-muted-foreground" />
                        Facebook
                    </button>

                    <button
                        onClick={() => onSocialShare("whatsapp")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                    >
                        <Icon icon="mingcute:whatsapp-line" className="w-4 h-4 text-muted-foreground" />
                        WhatsApp
                    </button>

                    <button
                        onClick={() => onSocialShare("telegram")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                    >
                        <Icon icon="mingcute:telegram-line" className="w-4 h-4 text-muted-foreground" />
                        Telegram
                    </button>

                    {socialLinks.pinterest && (
                        <button
                            onClick={() => onSocialShare("pinterest")}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                        >
                            <Icon icon="mingcute:pinterest-line" className="w-4 h-4 text-muted-foreground" />
                            Pinterest
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
