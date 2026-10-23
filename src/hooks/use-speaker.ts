import { useRef } from "react";

export function useSpeaker() {
  const clips = useRef<HTMLAudioElement[]>([]);

  function stop() {
    for (const clip of clips.current) {
      clip.pause();
      clip.removeAttribute("src");
    }
    clips.current = [];
    speechSynthesis.cancel();
  }

  function speak(sentences: string[]) {
    stop();
    // Every sentence starts loading now, so the next is ready in time.
    clips.current = sentences.map(
      (sentence) => new Audio(`/api/tts?text=${encodeURIComponent(sentence)}`),
    );
    play(0, sentences);
  }

  function play(index: number, sentences: string[]) {
    const clip = clips.current[index];
    if (!clip) return;

    const next = () => play(index + 1, sentences);
    const fallback = () => {
      // Skip clips that stop() already cancelled.
      if (clips.current[index] === clip) {
        speakWithBrowser(sentences[index], next);
      }
    };
    clip.onended = next;
    clip.onerror = fallback;
    clip.play().catch(fallback);
  }

  return { speak, stop };
}

function speakWithBrowser(text: string, onDone: () => void) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.onend = onDone;
  utterance.onerror = onDone;
  speechSynthesis.speak(utterance);
}
