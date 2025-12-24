import { forwardRef, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
    size?: "sm" | "md" | "lg" | "icon";
    loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]",
            secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:border-border-hover",
            ghost: "bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "bg-transparent border border-border text-foreground hover:bg-white/5 hover:border-border-hover",
        };

        const sizes = {
            sm: "h-9 px-3 text-xs rounded-lg gap-1.5",
            md: "h-11 px-5 text-sm rounded-xl gap-2",
            lg: "h-12 px-6 text-base rounded-xl gap-2",
            icon: "h-11 w-11 rounded-xl",
        };

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(
                    "inline-flex items-center justify-center font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                    "active:scale-[0.98]",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button, type ButtonProps };
