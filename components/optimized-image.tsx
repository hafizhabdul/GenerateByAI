"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  onClick?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  fill = true,
  width,
  height,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  onClick,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface-2 text-muted-foreground",
          className
        )}
        onClick={onClick}
      >
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

  const imageProps = fill
    ? { fill: true, sizes }
    : { width: width || 256, height: height || 256 };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isLoading && "animate-pulse bg-surface-2",
        className
      )}
      onClick={onClick}
    >
      <Image
        src={src}
        alt={alt}
        {...imageProps}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
        className={cn(
          "object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        unoptimized={src.startsWith("data:")}
      />
    </div>
  );
}

export function GalleryImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn("aspect-square", className)}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      onClick={onClick}
    />
  );
}

export function ModalImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill={false}
      width={1024}
      height={1024}
      className={cn("w-full h-full object-contain", className)}
      sizes="(max-width: 768px) 100vw, 80vw"
      priority
    />
  );
}
