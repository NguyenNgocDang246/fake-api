import { toast } from "react-toastify";
import { Check, X, AlertTriangle, Info, LucideIcon } from "lucide-react";

type Variant = "success" | "error" | "warning" | "info";

const ICONS: Record<Variant, LucideIcon> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

// `--fa-toast-accent` is set per variant on the toast itself in globals.css, so the chip and the
// label read it off their ancestor rather than each knowing the palette.
const ACCENT = "var(--fa-toast-accent)";

function ToastIcon({ variant }: { variant: Variant }) {
  const Glyph = ICONS[variant];

  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
      style={{
        background: `color-mix(in oklab, ${ACCENT} 16%, transparent)`,
        color: ACCENT,
      }}
    >
      <Glyph size={15} strokeWidth={3} />
    </span>
  );
}

function ToastBody({ variant, message }: { variant: Variant; message: string }) {
  return (
    <div className="min-w-0 flex-1">
      <span
        className="block text-xs leading-none font-semibold tracking-[0.08em] uppercase"
        style={{ color: ACCENT }}
      >
        {variant}
      </span>
      <p className="mt-1.5 text-sm leading-normal break-words text-gray-300">{message}</p>
    </div>
  );
}

function show(variant: Variant, message: string) {
  return toast[variant](<ToastBody variant={variant} message={message} />, {
    icon: <ToastIcon variant={variant} />,
  });
}

const Notify = {
  success: (msg: string) => show("success", msg),
  error: (msg: string) => show("error", msg),
  warning: (msg: string) => show("warning", msg),
  info: (msg: string) => show("info", msg),
};

export default Notify;
