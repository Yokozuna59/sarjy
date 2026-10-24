import { Plus } from "lucide-react";
import { Button } from "~/components/Button";
import { cn } from "~/lib/cn";

interface ChatHeaderProps {
  canStartNew: boolean;
  canForget: boolean;
  onNewChat: () => void;
  onForget: () => void;
}

export function ChatHeader({
  canStartNew,
  canForget,
  onNewChat,
  onForget,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between border-b px-4 py-3",
        "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <h1 className="text-lg font-semibold tracking-tight">Sarjy</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="danger"
          shape="pill"
          onClick={onForget}
          disabled={!canForget}
        >
          Forget me
        </Button>
        <Button
          variant="outline"
          shape="pill"
          onClick={onNewChat}
          disabled={!canStartNew}
        >
          <Plus className="size-4" />
          New chat
        </Button>
      </div>
    </header>
  );
}
