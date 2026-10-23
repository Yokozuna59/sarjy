import { Plus } from "lucide-react";
import { cn } from "~/lib/cn";

interface ChatHeaderProps {
  canStartNew: boolean;
  onNewChat: () => void;
}

export function ChatHeader({ canStartNew, onNewChat }: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between border-b px-4 py-3",
        "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <h1 className="text-lg font-semibold tracking-tight">Sarjy</h1>
      <button
        type="button"
        onClick={onNewChat}
        disabled={!canStartNew}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
          "text-sm font-medium border-zinc-300 dark:border-zinc-700",
          "enabled:cursor-pointer enabled:hover:bg-zinc-100",
          "dark:enabled:hover:bg-zinc-800 disabled:opacity-40",
        )}
      >
        <Plus className="size-4" />
        New chat
      </button>
    </header>
  );
}
