"use client";
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
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={handleCancel}>
            Hủy
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleConfirm}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
