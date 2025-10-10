"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { FormModalProps, FormModal } from "./FormModal";
import { ConfirmModalProps, ConfirmModal } from "./ConfirmModal";

type ModalState =
  | { id: string; type: "form"; props: Omit<FormModalProps, "onClose"> }
  | { id: string; type: "confirm"; props: Omit<ConfirmModalProps, "onClose"> };

interface ModalContextType {
  modals: ModalState[];
  openModal: (modal: Omit<ModalState, "id">) => string;
  closeModal: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  const [modals, setModals] = useState<ModalState[]>([]);
  const openModal = (modal: Omit<ModalState, "id">) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const id = `modal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setModals((prev) => [...prev, { id, ...modal } as ModalState]);
    return id;
  };

  const closeModal = (id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  };

  useEffect(() => {
    if (modals.length > 0) {
      // Ngăn cuộn
      document.body.style.overflow = "hidden";
    } else {
      // Cho phép cuộn lại
      document.body.style.overflow = "";
    }

    // Đảm bảo dọn dẹp khi component unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [modals.length]);

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal }}>
      {children}
      {modals.map((m) => {
        if (m.type === "form")
          return <FormModal key={m.id} {...m.props} onClose={() => closeModal(m.id)} />;
        if (m.type === "confirm")
          return <ConfirmModal key={m.id} {...m.props} onClose={() => closeModal(m.id)} />;
        return null;
      })}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
