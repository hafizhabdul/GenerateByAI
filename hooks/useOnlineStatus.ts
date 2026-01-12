"use client";

import { useState, useEffect, useCallback } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize with actual status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Track that we were offline (for showing reconnection message)
      if (!navigator.onLine === false) {
        setWasOffline(true);
        // Clear the "was offline" state after a delay
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return { isOnline, wasOffline, clearWasOffline };
}

// Hook for checking network quality
export function useNetworkQuality() {
  const [quality, setQuality] = useState<"unknown" | "slow" | "fast">("unknown");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for Network Information API
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType: string;
        addEventListener: (type: string, listener: () => void) => void;
        removeEventListener: (type: string, listener: () => void) => void;
      };
    }).connection;

    if (!connection) {
      setQuality("unknown");
      return;
    }

    const updateQuality = () => {
      const effectiveType = connection.effectiveType;
      if (effectiveType === "slow-2g" || effectiveType === "2g") {
        setQuality("slow");
      } else {
        setQuality("fast");
      }
    };

    updateQuality();
    connection.addEventListener("change", updateQuality);

    return () => {
      connection.removeEventListener("change", updateQuality);
    };
  }, []);

  return quality;
}
