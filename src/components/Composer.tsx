import type { ChangeEvent, KeyboardEvent, SubmitEvent } from "react";
import type { VoiceHandlers } from "~/hooks/use-voice";
import { ArrowUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "~/components/Button";
import { VoiceButton } from "~/components/VoiceButton";
import { cn } from "~/lib/cn";
import { MAX_MESSAGE_LENGTH } from "~/lib/turn";

interface ComposerProps {
  disabled: boolean;
  onSend: (text: string) => void;
  voice: VoiceHandlers;
}

export function Composer({ disabled, onSend, voice }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${event.target.scrollHeight}px`;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: an input method is still building a character.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-end gap-2 rounded-3xl border p-2",
        "border-zinc-300 bg-white focus-within:border-zinc-500",
        "dark:border-zinc-700 dark:bg-zinc-900",
      )}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Type a message"
        aria-label="Message"
        dir="auto"
        className={cn(
          "max-h-40 flex-1 resize-none px-3 py-2",
          "bg-transparent outline-none",
        )}
      />
      <VoiceButton voice={voice} />
      <Button
        type="submit"
        variant="primary"
        shape="circle"
        aria-label="Send"
        disabled={disabled || !text.trim()}
      >
        <ArrowUp className="size-5" />
      </Button>
    </form>
  );
}
