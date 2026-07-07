import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { transcribeAudio } from "../services/api";

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError: (msg: string) => void;
}

export default function AudioRecorder({ onTranscriptionComplete, onError }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [amplitude, setAmplitude] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Clean up recording assets on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio Analyser for visual waves
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        
        if (audioBlob.size > 100) {
          await handleTranscription(audioBlob);
        }
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
      setIsRecording(true);
      
      // Start visualization
      visualize();
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      onError("Could not access microphone. Please check system permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAmplitude([]);
    }
  };

  const visualize = () => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording || !analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Map amplitude levels
      const levels = Array.from(dataArray).slice(0, 10).map(v => Math.max(4, (v / 255) * 40));
      setAmplitude(levels);
    };
    
    draw();
  };

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const result = await transcribeAudio(blob);
      // If backend returned simulated flag, Whisper sidecar is not available on this device.
      // Never surface technical install instructions to end users (Store policy).
      if (result.simulated === true) {
        onError(
          "Voice transcription is not available on this device. Typed input is fully supported."
        );
        return;
      }
      if (result.transcript && result.transcript.trim()) {
        onTranscriptionComplete(result.transcript);
      } else {
        onError("Transcription was completed but returned no textual output.");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      onError("Failed to transcribe audio. Check that the backend is running.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center gap-sm">
      {/* Animated visualizer */}
      {isRecording && (
        <div className="flex items-center gap-[3px] h-10 px-4 bg-status-error-bg/30 border border-status-error-border/30 rounded-full animate-pulse mr-2 select-none">
          {amplitude.map((height, i) => (
            <div 
              key={i} 
              className="w-[3px] bg-status-error rounded-full transition-all duration-75"
              style={{ height: `${height}px` }}
            />
          ))}
          <span className="text-[10px] text-status-error font-semibold uppercase font-sans tracking-wide ml-2 animate-bounce">
            REC
          </span>
        </div>
      )}

      {/* Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isTranscribing}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? "bg-status-error text-white hover:bg-status-error-border scale-110 shadow-lg shadow-status-error/20"
            : "text-text-muted hover:bg-card-bg hover:text-text-primary"
        } ${isTranscribing ? "opacity-50 pointer-events-none" : ""}`}
        title={isRecording ? "Stop recording and transcribe" : "Voice input - speak to Aura"}
      >
        {isTranscribing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary-light" />
        ) : isRecording ? (
          <Square className="w-4 h-4 text-white fill-white" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
