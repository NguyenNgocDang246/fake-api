"use client";
import { createContext, useContext, useState } from "react";
import { FormModalProps, FormModal } from "./FormModal";
import { AlertModalProps, AlertModal } from "./AlertModal";
import { ConfirmModalProps, ConfirmModal } from "./ConfirmModal";

type ModalState =
  | { id: string; type: "form"; props: Omit<FormModalProps, "onClose"> }
  | { id: string; type: "alert"; props: AlertModalProps }
  | { id: string; type: "confirm"; props: ConfirmModalProps };

interface ModalContextType {
  modals: ModalState[];
  openModal: (modal: Omit<ModalState, "id">) => string;
  closeModal: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  const [modals, setModals] = useState<ModalState[]>([]);
  const openModal = (modal: Omit<ModalState, "id">) => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setModals((prev) => [...prev, { id, ...modal } as ModalState]);
    return id;
  };

  const closeModal = (id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 h-screen flex flex-col-reverse gap-4">
        {modals
          .filter((m) => m.type === "alert")
          .map((m) => {
            return <AlertModal key={m.id} {...m.props} onClose={() => closeModal(m.id)} />;
          })}
      </div>

      {modals
        .filter((m) => m.type !== "alert")
        .map((m) => {
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
