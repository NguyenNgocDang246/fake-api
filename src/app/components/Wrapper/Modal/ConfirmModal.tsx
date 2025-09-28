"use client";
import { useState } from "react";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { AlertTriangle, HelpCircle, Check } from "lucide-react";

const CONFIRM_TEXT = "Fake API";
export interface ConfirmModalProps {
  question: string;
  onConfirm: () => Promise<boolean>;
  onCancel?: () => void;
  onClose: () => void;
  critical?: boolean;
}

export function ConfirmModal({
  question,
  onConfirm,
  onCancel,
  onClose,
  critical = false,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = async () => {
    if (critical && confirmText !== CONFIRM_TEXT) return;
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
      <div className="bg-white p-6 rounded-xl shadow-xl w-96">
        <div className="flex items-center gap-3 mb-4">
          {critical ? (
            <div className="w-12 h-12 rounded-full bg-red-200 flex pt-2.5 justify-center">
              <AlertTriangle className="w-6 h-6 text-red-700" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">{question}</h3>
            <p className="text-sm text-muted-foreground">
              {critical ? "Warning: Confirm dangerous action." : "Please confirm your action."}
            </p>
          </div>
        </div>

        <p className="text-card-foreground leading-relaxed mb-6 text-center">
          Are you sure you want to perform this action?
        </p>

        {critical && (
          <div className="px-6 pb-4">
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium mb-3">
                Để xác nhận, vui lòng nhập:{" "}
                <span className="font-mono bg-red-300 px-2 py-1 rounded-xl text-xs">
                  {CONFIRM_TEXT}
                </span>
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={confirmText}
                  placeholder={CONFIRM_TEXT}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-background border-b border-input text-foreground border-red-600 placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isConfirming}
                />
                {confirmText === CONFIRM_TEXT && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            disabled={isConfirming || (critical && confirmText !== "Fake API")}
          />
        </div>
      </div>
    </div>
  );
}
