import { AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

export function WarningCallout({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
