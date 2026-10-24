"use client";

import type { VoiceHandlers } from "~/hooks/use-voice";
import { LoaderCircle, Mic } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "~/components/Button";

// Loaded on the first click, so typing-only visitors skip the voice model.
const ListeningButton = dynamic(
  () => import("~/components/ListeningButton").then((m) => m.ListeningButton),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="outline"
        shape="circle"
        aria-label="Starting the microphone"
        disabled
      >
        <LoaderCircle className="size-5 animate-spin" />
      </Button>
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
    <Button
      variant="outline"
      shape="circle"
      aria-label="Start talking"
      onClick={() => setOn(true)}
    >
      <Mic className="size-5" />
    </Button>
  );
}
