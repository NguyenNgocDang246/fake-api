"use client";

import React from "react";

interface SpinnerProps {
  size?: number; // px
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 40 }) => {
  return (
    <div
      className="relative animate-spin rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 p-1"
      style={{ width: size, height: size }}
    >
      <div className="h-full w-full rounded-full bg-white dark:bg-gray-900" />
    </div>
  );
};
