import { useMicVAD, utils } from "@ricky0123/vad-react";

const CDN = "https://cdn.jsdelivr.net/npm";

export function useVoice(onSpeech: (wav: Blob) => void) {
  return useMicVAD({
    // Keep these versions in step with the installed packages.
    baseAssetPath: `${CDN}/@ricky0123/vad-web@0.0.31/dist/`,
    onnxWASMBasePath: `${CDN}/onnxruntime-web@1.30.0/dist/`,
    model: "v5",
    startOnLoad: true,
    redemptionMs: 700,
    onSpeechEnd: (audio) => {
      const wav = utils.encodeWAV(audio, 1, 16000, 1, 16);
      onSpeech(new Blob([wav], { type: "audio/wav" }));
    },
  });
}
