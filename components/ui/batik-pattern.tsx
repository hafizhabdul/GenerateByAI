import React from "react";

interface BatikPatternProps {
    className?: string;
    opacity?: number;
    color?: string;
}

export function BatikPattern({
    className = "",
    opacity = 0.05,
    color = "currentColor"
}: BatikPatternProps) {
    return (
        <div
            className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
            style={{ zIndex: 0 }}
        >
            <svg
                className="absolute w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
                style={{ opacity }}
            >
                <defs>
                    <pattern
                        id="batik-parang"
                        x="0"
                        y="0"
                        width="60"
                        height="60"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                    >
                        {/* abstract parang-inspired stroke */}
                        <path
                            d="M0 30 C 10 20, 20 20, 30 30 S 50 40, 60 30"
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M0 60 C 10 50, 20 50, 30 60 S 50 70, 60 60"
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M0 0 C 10 -10, 20 -10, 30 0 S 50 10, 60 0"
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#batik-parang)" />
            </svg>

            {/* Vignette overlay for depth without gradient feel */}
            <div className="absolute inset-0 bg-background/50 mix-blend-multiply" />
        </div>
    );
}
