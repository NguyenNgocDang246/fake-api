"use client";
import { useEffect } from "react";

export interface AlertModalProps {
  message: string;
  onClose: () => void;
  expiresAt: number;
}

export function AlertModal({ message, onClose, expiresAt }: AlertModalProps) {
  useEffect(() => {
    const now = Date.now();
    const remaining = Math.max(0, expiresAt - now);

    const timer = setTimeout(onClose, remaining);
    return () => clearTimeout(timer);
  }, [expiresAt, onClose]);

  return (
    <div className="bg-blue-500 text-white px-4 py-2 rounded shadow-md mb-2 min-w-[200px]">
      {message}
    </div>
  );
}
