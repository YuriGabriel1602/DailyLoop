import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export const PrometheusVoice = () => {
  const { isListening, addMessage } = useStore();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false; 

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        addMessage('user', transcript);
        if ((window as any).askPrometheus) (window as any).askPrometheus(transcript, 'voice');
      }
    };

    recognition.onend = () => { if (isListening) recognition.start(); };
    if (isListening) recognition.start(); else recognition.stop();

    return () => recognition.stop();
  }, [isListening]);

  return null;
};