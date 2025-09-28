import { toast, ToastOptions } from "react-toastify";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

const base: ToastOptions = {
  className: "!rounded-2xl ",
};

const Notify = {
  success: (msg: string) =>
    toast.success(msg, {
      ...base,
      className: base.className + " !text-blue-700 ",
      progressClassName: "!bg-blue-600",
      icon: <CheckCircle size={24} className="text-blue-700" />,
    }),
  error: (msg: string) =>
    toast.error(msg, {
      ...base,
      className: base.className + " !text-red-700 ",
      progressClassName: "!bg-red-600",
      icon: <XCircle size={24} className="!text-red-700" />,
    }),
  warning: (msg: string) =>
    toast.warning(msg, {
      ...base,
      className: base.className + " !text-yellow-700",
      progressClassName: "!bg-yellow-600",
      icon: <AlertTriangle size={24} className="!text-yellow-700" />,
    }),
  info: (msg: string) =>
    toast.info(msg, {
      ...base,
      className: base.className + " !text-black",
      progressClassName: "!bg-gray-700",
      icon: <Info size={24} className=" !text-black" />,
    }),
};

export default Notify;
