import React, { useState, useRef } from "react";
import { UploadCloud, FileText, FileAudio, FileImage, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadDocument, indexImage, transcribeAudio } from "../services/api";

interface FileUploaderProps {
  onUploadSuccess: (filename: string, type: string) => void;
  onAudioTranscribed?: (text: string) => void;
  onError: (msg: string) => void;
}

export default function FileUploader({ onUploadSuccess, onAudioTranscribed, onError }: FileUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [currentAction, setCurrentAction] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isDoc = ext === "pdf" || ext === "txt";
    const isImage = ext === "png" || ext === "jpg" || ext === "jpeg";
    const isAudio = ext === "wav" || ext === "mp3" || ext === "ogg";

    if (!isDoc && !isImage && !isAudio) {
      onError("Unsupported file format. Please upload PDF, TXT, PNG, JPG, JPEG, WAV, or MP3.");
      return;
    }

    setFileName(file.name);
    setStatus("uploading");
    setProgress(0);

    let fakeInterval: any = null;
    const startFakeTicks = (actionText: string) => {
      setCurrentAction(actionText);
      let current = 90;
      fakeInterval = setInterval(() => {
        if (current < 98) {
          current += 1;
          setProgress(current);
        } else {
          clearInterval(fakeInterval);
        }
      }, 700);
    };

    const handleProgress = (pct: number) => {
      if (pct < 100) {
        setCurrentAction("Uploading file to server...");
        setProgress(Math.round((pct * 90) / 100));
      } else {
        setProgress(90);
        if (isDoc) {
          startFakeTicks("Extracting text and chunking...");
        } else if (isImage) {
          startFakeTicks("Analyzing visual elements & indexing...");
        } else if (isAudio) {
          startFakeTicks("Transcribing vocal segments...");
        }
      }
    };

    try {
      if (isDoc) {
        const uploadPromise = uploadDocument(file, handleProgress);
        // Start processing ticks as soon as upload is done
        uploadPromise.then(() => {}).catch(() => {});
        // In this case, we just trigger ticks once progress reaches 100
        const result = await uploadPromise;
        if (fakeInterval) clearInterval(fakeInterval);
        setProgress(100);
        setStatus("success");
        onUploadSuccess(file.name, "document");
      } else if (isImage) {
        const indexPromise = indexImage(file, handleProgress);
        const result = await indexPromise;
        if (fakeInterval) clearInterval(fakeInterval);
        setProgress(100);
        setStatus("success");
        onUploadSuccess(file.name, "image");
      } else if (isAudio) {
        const transcribePromise = transcribeAudio(file, handleProgress);
        const result = await transcribePromise;
        if (fakeInterval) clearInterval(fakeInterval);
        setProgress(100);
        setStatus("success");
        onUploadSuccess(file.name, "audio");
        if (onAudioTranscribed && result.transcript) {
          onAudioTranscribed(result.transcript);
        }
      }

      // Reset state after success animation
      setTimeout(() => {
        setStatus("idle");
        setProgress(0);
        setFileName("");
        setCurrentAction("");
      }, 3000);

    } catch (err: any) {
      if (fakeInterval) clearInterval(fakeInterval);
      console.error("Indexation failed:", err);
      setStatus("error");
      onError(err.message || "Failed to process and index file. Confirm local on-premises service setup.");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.txt,.png,.jpg,.jpeg,.wav,.mp3"
        onChange={handleFileChange}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={status === "idle" ? triggerFileSelect : undefined}
        className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[140px] text-center select-none ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-border-default hover:border-border-hover hover:bg-card-bg/50"
        } ${status !== "idle" ? "pointer-events-none" : ""}`}
      >
        {status === "idle" && (
          <>
            <div className="w-10 h-10 rounded-full bg-app-bg flex items-center justify-center text-text-secondary mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="font-sans text-sm font-semibold text-text-primary">
              Drag & drop files here, or click to browse
            </p>
            <p className="font-sans text-xs text-text-muted mt-1">
              Supports PDF, PNG, JPG, WAV, MP3 (Max 15MB)
            </p>
          </>
        )}

        {status === "uploading" && (
          <div className="w-full max-w-sm flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-primary-light animate-spin mb-3" />
            <span className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 select-text">
              {currentAction}
            </span>
            <p className="font-sans text-xs text-text-muted truncate w-full max-w-xs mb-3">
              Indexing: <span className="font-semibold">{fileName}</span>
            </p>
            
            {/* Elegant 4px Progress Bar requested in Guidelines */}
            <div className="w-full bg-app-bg h-1 rounded-full overflow-hidden mb-2">
              <div 
                className="bg-status-success h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-sans text-[10px] text-text-muted font-bold">
              {progress}% Completed
            </span>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-status-success mb-3 animate-bounce" />
            <p className="font-sans text-sm font-bold text-text-primary">
              Successfully indexed!
            </p>
            <p className="font-sans text-xs text-text-secondary mt-1 select-text">
              {fileName} is now active in workspace.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-status-error mb-3 animate-pulse" />
            <p className="font-sans text-sm font-bold text-text-primary">
              Indexation failed
            </p>
            <p className="font-sans text-xs text-status-error mt-1">
              Please check configuration and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
