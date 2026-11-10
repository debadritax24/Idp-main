"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseCountdownReturn {
  secondsRemaining: number;
  isActive: boolean;
  start: (seconds: number) => void;
  reset: () => void;
}

/**
 * Custom React hook for countdown timers (e.g. rate-limit cooldowns, token TTL counters).
 */
export function useCountdown(initialSeconds = 0): UseCountdownReturn {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const start = useCallback((seconds: number) => {
    setSecondsRemaining(Math.max(0, seconds));
  }, []);

  const reset = useCallback(() => {
    setSecondsRemaining(0);
  }, []);

  return {
    secondsRemaining,
    isActive: secondsRemaining > 0,
    start,
    reset,
  };
}
