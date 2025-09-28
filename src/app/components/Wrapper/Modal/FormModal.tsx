"use client";
import { ReactNode, useState } from "react";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
import { ActionButton } from "@/app/components/Button/ActionButton";

export interface FormModalProps {
  title: string;
  children?: ReactNode;
  onSubmit: () => Promise<boolean>;
  onClose: () => void;
}

export function FormModal({ title, children, onSubmit, onClose }: FormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const result = await onSubmit();
      if (result) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-96">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit}>
          {children}
          <div className="flex justify-end gap-2 mt-4">
            <ActionButton
              label="Cancel"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            />
            <SubmitButton
              label={isSubmitting ? "Submitting..." : "Submit"}
              className="flex-1"
              disabled={isSubmitting}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
