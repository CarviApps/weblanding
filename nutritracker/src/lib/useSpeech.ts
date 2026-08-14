import { useCallback, useEffect, useRef, useState } from "react";

/** Dictado por voz con la Web Speech API (Chrome/Safari). */
export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "es-AR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => cbRef.current(e.results[0][0].transcript);
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setSupported(true);
    return () => {
      try {
        rec.stop();
      } catch {
        /* ya estaba detenido */
      }
    };
  }, []);

  const toggle = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  return { supported, listening, toggle };
}
