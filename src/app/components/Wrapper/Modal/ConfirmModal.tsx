"use client";
import { useState } from "react";
import { ActionButton } from "@/app/components/Button/ActionButton";

export interface ConfirmModalProps {
  question: string;
  onConfirm: () => Promise<boolean>;
  onCancel?: () => void;
  onClose: () => void;
}

export function ConfirmModal({ question, onConfirm, onCancel, onClose }: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      const ok = await onConfirm();
      if (ok) {
        onClose();
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    if (!isConfirming) {
      onCancel?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-80">
        <p className="mb-6">{question}</p>
        <div className="flex gap-2">
          <ActionButton
            label="Cancel"
            onClick={handleCancel}
            className="flex-1"
            disabled={isConfirming}
          />
          <ActionButton
            label={isConfirming ? "Confirming..." : "Confirm"}
            type="delete"
            onClick={handleConfirm}
            className="flex-1"
            disabled={isConfirming}
          />
        </div>
      </div>
    </div>
  );
}
