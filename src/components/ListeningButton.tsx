import type { VoiceHandlers } from "~/hooks/use-voice";
import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { IconButton } from "~/components/IconButton";
import { useVoice } from "~/hooks/use-voice";

interface ListeningButtonProps {
  voice: VoiceHandlers;
  onStop: () => void;
}

export function ListeningButton({ voice, onStop }: ListeningButtonProps) {
  const mic = useVoice(voice);

  if (mic.errored) {
    return (
      <IconButton
        variant="outline"
        label={`Microphone unavailable: ${mic.errored}`}
        onClick={onStop}
      >
        <MicOff className="size-5 text-red-600 dark:text-red-400" />
      </IconButton>
    );
  }

  if (mic.loading) {
    return (
      <IconButton variant="outline" label="Starting the microphone" disabled>
        <LoaderCircle className="size-5 animate-spin" />
      </IconButton>
    );
  }

  return (
    <IconButton
      variant="recording"
      label="Stop listening"
      onClick={onStop}
      className={mic.userSpeaking ? "animate-pulse" : undefined}
    >
      <Mic className="size-5" />
    </IconButton>
  );
}
