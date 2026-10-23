import type { ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

const variants = {
  primary: cn(
    "bg-zinc-900 text-white enabled:hover:bg-zinc-700",
    "dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-zinc-300",
  ),
  outline: cn(
    "border border-zinc-300 enabled:hover:bg-zinc-100",
    "dark:border-zinc-700 dark:enabled:hover:bg-zinc-800",
  ),
  recording: "bg-red-600 text-white enabled:hover:bg-red-700",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant: keyof typeof variants;
}

export function IconButton({
  label,
  variant,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        "enabled:cursor-pointer disabled:opacity-30",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
