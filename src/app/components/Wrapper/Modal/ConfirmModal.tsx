"use client";
import { ActionButton } from "@/app/components/Button/ActionButton";
export interface ConfirmModalProps {
  question: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export function ConfirmModal({ question, onConfirm, onCancel, onClose }: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-80">
        <p className="mb-6">{question}</p>
        <div className="flex gap-2">
          <ActionButton label="Cancel" onClick={handleCancel} className="flex-1" />
          <ActionButton label="Confirm" type="delete" onClick={handleConfirm} className="flex-1" />
        </div>
      </div>
    </div>
  );
}
