import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: "default" | "glass" | "outline" | "elevated";
    hover?: boolean;
    padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
    children,
    className,
    variant = "default",
    hover = false,
    padding = "md"
}: CardProps) {
    const variants = {
        default: "bg-card border border-border",
        glass: "glass",
        outline: "bg-transparent border border-border",
        elevated: "bg-card border border-border shadow-xl",
    };

    const paddings = {
        none: "",
        sm: "p-3 sm:p-4",
        md: "p-4 sm:p-6",
        lg: "p-6 sm:p-8",
    };

    return (
        <div
            className={cn(
                "rounded-2xl transition-all duration-300",
                variants[variant],
                paddings[padding],
                hover && "hover:border-border-hover hover:shadow-lg cursor-pointer hover:-translate-y-0.5",
                className
            )}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            {children}
        </div>
    );
}

interface CardTitleProps {
    children: ReactNode;
    className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <h3 className={cn("text-lg font-semibold text-foreground", className)}>
            {children}
        </h3>
    );
}

interface CardDescriptionProps {
    children: ReactNode;
    className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            {children}
        </p>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={cn("", className)}>
            {children}
        </div>
    );
}

interface CardFooterProps {
    children: ReactNode;
    className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div className={cn("flex items-center pt-4", className)}>
            {children}
        </div>
    );
}
