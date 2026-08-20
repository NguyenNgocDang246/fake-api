export type ModalSize = "normal" | "wide";

export const MODAL_SIZE_CLASSES: Record<ModalSize, string> = {
  normal: "w-96",
  wide: "w-[32rem]",
};

export const MODAL_PANEL_CLASSES = "bg-white p-6 rounded-xl shadow-xl max-w-[90vw]";
