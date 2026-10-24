import type { VoiceHandlers } from "~/hooks/use-voice";
import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { Button } from "~/components/Button";
import { useVoice } from "~/hooks/use-voice";

interface ListeningButtonProps {
  voice: VoiceHandlers;
  onStop: () => void;
}

export function ListeningButton({ voice, onStop }: ListeningButtonProps) {
  const mic = useVoice(voice);

  if (mic.errored) {
    return (
      <Button
        variant="outline"
        shape="circle"
        aria-label={`Microphone unavailable: ${mic.errored}`}
        title={mic.errored}
        onClick={onStop}
      >
        <MicOff className="size-5 text-red-600 dark:text-red-400" />
      </Button>
    );
  }

  if (mic.loading) {
    return (
      <Button
        variant="outline"
        shape="circle"
        aria-label="Starting the microphone"
        disabled
      >
        <LoaderCircle className="size-5 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant="recording"
      shape="circle"
      aria-label="Stop listening"
      onClick={onStop}
      className={mic.userSpeaking ? "animate-pulse" : undefined}
    >
      <Mic className="size-5" />
    </Button>
  );
}
