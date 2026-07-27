import { toast, ToastOptions } from "react-toastify";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  LucideIcon,
} from "lucide-react";

type Variant = "success" | "error" | "warning" | "info";

const ICONS: Record<Variant, LucideIcon> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const BADGE_CLASSES: Record<Variant, string> = {
  success: "bg-green-100 text-green-600",
  error: "bg-red-100 text-red-600",
  warning: "bg-yellow-100 text-yellow-600",
  info: "bg-blue-100 text-blue-600",
};

function renderIcon(variant: Variant) {
  const Icon = ICONS[variant];
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${BADGE_CLASSES[variant]}`}
    >
      <Icon size={18} strokeWidth={2.5} />
    </span>
  );
}

const options = (variant: Variant): ToastOptions => ({
  icon: renderIcon(variant),
});

const Notify = {
  success: (msg: string) => toast.success(msg, options("success")),
  error: (msg: string) => toast.error(msg, options("error")),
  warning: (msg: string) => toast.warning(msg, options("warning")),
  info: (msg: string) => toast.info(msg, options("info")),
};

export default Notify;
