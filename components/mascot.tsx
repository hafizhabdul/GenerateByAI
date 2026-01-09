"use client";

import { cn } from "@/lib/utils";

export type MascotExpression =
  | "happy"      // ✨ Success, celebration
  | "thinking"   // 🤔 Loading, processing
  | "confused"   // ❓ Not enough tokens, errors
  | "sleepy"     // 💤 Coming soon, waiting
  | "celebrating"; // 🎉 Milestones, first generation

export interface MascotProps {
  expression?: MascotExpression;
  size?: "small" | "medium" | "large" | "hero";
  className?: string;
  showEmoji?: boolean;
}

const sizeClasses = {
  small: "w-8 h-8",
  medium: "w-16 h-16",
  large: "w-24 h-24",
  hero: "w-32 h-32",
};

const expressionEmojis: Record<MascotExpression, string> = {
  happy: "✨",
  thinking: "💭",
  confused: "❓",
  sleepy: "💤",
  celebrating: "🎉",
};

const expressionAnimations: Record<MascotExpression, string> = {
  happy: "animate-bounce",
  thinking: "animate-tilt",
  confused: "animate-head-scratch",
  sleepy: "animate-wobble",
  celebrating: "animate-jump",
};

/**
 * Mascot Component - SquirrAI's playful squirrel character
 * 
 * Usage:
 * <Mascot expression="happy" size="large" />
 * <Mascot expression="thinking" size="medium" />
 * 
 * Expressions:
 * - happy: Success, celebration
 * - thinking: Loading, processing
 * - confused: Errors, not enough tokens
 * - sleepy: Coming soon, waiting
 * - celebrating: Big wins
 */
export function Mascot({
  expression = "happy",
  size = "medium",
  className,
  showEmoji = true,
}: MascotProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Mascot Image */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          sizeClasses[size],
          expressionAnimations[expression],
          `mascot-${expression}`,
          className
        )}
      >
        <img
          src="/maskot.png"
          alt="SquirrAI"
          className={cn(
            "w-full h-full object-contain drop-shadow-lg",
            // Expression-specific styles
            expression === "thinking" && "opacity-90",
            expression === "sleepy" && "opacity-75",
            expression === "celebrating" && "scale-110"
          )}
        />
      </div>

      {/* Expression Emoji */}
      {showEmoji && (
        <div
          className={cn(
            "absolute -top-2 -right-2 text-xl animate-pop",
            `emoji-${expression}`
          )}
        >
          {expressionEmojis[expression]}
        </div>
      )}
    </div>
  );
}

/**
 * Mascot with attached text message
 * Great for loading states, errors, etc.
 */
export function MascotWithMessage({
  expression = "thinking",
  size = "medium",
  message,
  submessage,
}: MascotProps & {
  message?: string;
  submessage?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Mascot expression={expression} size={size} />
      {message && (
        <div className="space-y-2">
          <p className="text-base md:text-lg font-semibold text-foreground">
            {message}
          </p>
          {submessage && (
            <p className="text-sm text-muted-foreground">{submessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Loading mascot with spinner
 * Perfect for async operations
 */
export function MascotLoading({
  message = "Squirrel is creating magic...",
  submessage,
}: {
  message?: string;
  submessage?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <Mascot expression="thinking" size="large" />
        <div className="absolute inset-0 animate-spin">
          <div className="w-full h-full rounded-full border-4 border-transparent border-t-primary border-r-primary" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-foreground">{message}</p>
        {submessage && (
          <p className="text-sm text-muted-foreground">{submessage}</p>
        )}
      </div>
    </div>
  );
}
