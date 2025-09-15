import Image from "next/image";
import { twMerge } from "tailwind-merge";
interface ImgProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}
interface ActionButtonProps {
  label?: string;
  icon: ImgProps;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const IconButton: React.FC<ActionButtonProps> = ({
  label,
  icon,
  onClick,
  disabled = false,
  className,
}) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={twMerge(
        "cursor-pointer font-medium flex gap-2 items-center justify-center hover:bg-blue-200 rounded-lg disabled:opacity-50 transition-colors outline-0 p-2",
        className
      )}
    >
      <Image
        src={icon.src}
        alt={icon.alt}
        width={icon.width}
        height={icon.height}
        className={icon.className}
      />
      {label && <p>{label}</p>}
    </button>
  );
};
