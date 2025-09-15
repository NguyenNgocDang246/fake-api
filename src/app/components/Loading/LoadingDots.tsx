"use client";

import { useEffect, useState } from "react";

interface LoadingDotsProps {
  text?: string;
  interval?: number; // thời gian đổi (ms)
  className?: string;
}

export function LoadingDots({ text = "Loading", interval = 500, className }: LoadingDotsProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev.length < 6 ? prev + " ." : ""));
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return (
    <span className={className}>
      {text}
      {dots}
    </span>
  );
}
