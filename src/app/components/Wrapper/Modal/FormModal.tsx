"use client";
import { ReactNode } from "react";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
import { ActionButton } from "@/app/components/Button/ActionButton";

export interface FormModalProps {
  title: string;
  children?: ReactNode;
  onSubmit: () => Promise<boolean>;
  onClose: () => void;
}

export function FormModal({ title, children, onSubmit, onClose }: FormModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onSubmit();
    if (result) onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-96">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={(e) => handleSubmit(e)}>
          {children}
          <div className="flex justify-end gap-2 mt-4">
            <ActionButton label="Cancel" onClick={onClose} className="flex-1" />
            <SubmitButton label="Save" className="flex-1" />
          </div>
        </form>
      </div>
    </div>
  );
}
