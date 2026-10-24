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
  danger: cn(
    "border border-zinc-300 enabled:hover:border-red-300",
    "enabled:hover:bg-red-50 enabled:hover:text-red-600",
    "dark:border-zinc-700 dark:enabled:hover:border-red-900",
    "dark:enabled:hover:bg-red-950 dark:enabled:hover:text-red-400",
  ),
  recording: "bg-red-600 text-white enabled:hover:bg-red-700",
};

const shapes = {
  pill: "h-8 gap-1.5 px-3 text-sm font-medium",
  circle: "size-10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: keyof typeof variants;
  shape: keyof typeof shapes;
}

export function Button({
  variant,
  shape,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "transition-colors enabled:cursor-pointer disabled:opacity-40",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-zinc-400",
        shapes[shape],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
