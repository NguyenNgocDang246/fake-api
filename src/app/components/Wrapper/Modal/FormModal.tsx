"use client";
import { ReactNode } from "react";

export interface FormModalProps {
  title: string;
  children?: ReactNode;
  onSubmit: () => void;
  onClose: () => void;
}

export function FormModal({ title, children, onSubmit, onClose }: FormModalProps) {
  const handleSubmit = () => {
    onSubmit();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-96">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit}>
          {children}
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>
              Đóng
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSubmit}>
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
