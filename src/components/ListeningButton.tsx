import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { IconButton } from "~/components/IconButton";
import { useVoice } from "~/hooks/use-voice";

interface ListeningButtonProps {
  onSpeech: (wav: Blob) => void;
  onStop: () => void;
}

export function ListeningButton({ onSpeech, onStop }: ListeningButtonProps) {
  const voice = useVoice(onSpeech);

  if (voice.errored) {
    return (
      <IconButton
        variant="outline"
        label={`Microphone unavailable: ${voice.errored}`}
        onClick={onStop}
      >
        <MicOff className="size-5 text-red-600 dark:text-red-400" />
      </IconButton>
    );
  }

  if (voice.loading) {
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
      className={voice.userSpeaking ? "animate-pulse" : undefined}
    >
      <Mic className="size-5" />
    </IconButton>
  );
}
