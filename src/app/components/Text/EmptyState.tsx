"use client";

import { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { NoContentText } from "@/app/components/Text/NoContentText";

interface EmptyStateProps {
  title: string;
  description?: string;
  // The caller passes its own button, so this stays free of any one page's action.
  action?: ReactNode;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({ title, description, action, className }) => {
  return (
    <div className={twMerge("flex flex-col items-center gap-4 text-center", className)}>
      <NoContentText message={title} />
      {action}
      {description && (
        <NoContentText message={description} className="max-w-md text-sm text-gray-500" />
      )}
    </div>
  );
};
