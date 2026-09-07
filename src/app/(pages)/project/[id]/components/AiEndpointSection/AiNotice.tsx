import React, { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface AiNoticeProps {
  title?: ReactNode;
  children: ReactNode;
}

export const AiNotice: React.FC<AiNoticeProps> = ({ title, children }) => {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        {title && <span className="font-medium">{title}</span>}
        {children}
      </div>
    </div>
  );
};
