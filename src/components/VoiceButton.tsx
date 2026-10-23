"use client";

import type { VoiceHandlers } from "~/hooks/use-voice";
import { LoaderCircle, Mic } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { IconButton } from "~/components/IconButton";

// Loaded on the first click, so typing-only visitors skip the voice model.
const ListeningButton = dynamic(
  () => import("~/components/ListeningButton").then((m) => m.ListeningButton),
  {
    ssr: false,
    loading: () => (
      <IconButton variant="outline" label="Starting the microphone" disabled>
        <LoaderCircle className="size-5 animate-spin" />
      </IconButton>
    ),
  },
);

interface VoiceButtonProps {
  voice: VoiceHandlers;
}

export function VoiceButton({ voice }: VoiceButtonProps) {
  const [on, setOn] = useState(false);

  if (on) {
    return <ListeningButton voice={voice} onStop={() => setOn(false)} />;
  }

  return (
    <IconButton
      variant="outline"
      label="Start talking"
      onClick={() => setOn(true)}
    >
      <Mic className="size-5" />
    </IconButton>
  );
}
