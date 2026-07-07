import { DocumentInfo, AudioTranscriptionResult, ImageSearchResult } from "../types";

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("Failed to load documents");
  return res.json();
}

export function uploadDocument(file: File, onProgress?: (pct: number) => void): Promise<{ id: string; name: string; pageCount: number; status: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/upload");

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText as any);
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || "Failed to upload and index document"));
        } catch (e) {
          reject(new Error("Failed to upload and index document"));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error during file upload"));

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export function transcribeAudio(file: Blob, onProgress?: (pct: number) => void): Promise<AudioTranscriptionResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/audio/transcribe");

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText as any);
        }
      } else {
        reject(new Error("Audio transcription failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during audio upload"));

    const formData = new FormData();
    formData.append("file", file, "recording.wav");
    xhr.send(formData);
  });
}

export function indexImage(file: File, onProgress?: (pct: number) => void): Promise<{ id: string; name: string; description: string; status: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/images/index");

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText as any);
        }
      } else {
        reject(new Error("Image semantic indexing failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during image upload"));

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export async function searchImages(query: string): Promise<ImageSearchResult[]> {
  const res = await fetch("/api/images/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Image semantic search failed");
  return res.json();
}

export async function fetchSessions(): Promise<any[]> {
  const res = await fetch("/api/chats/sessions");
  if (!res.ok) throw new Error("Failed to load chat sessions");
  return res.json();
}

export async function fetchSessionChats(sessionId: string): Promise<any[]> {
  const res = await fetch(`/api/chats/session/${sessionId}`);
  if (!res.ok) throw new Error("Failed to load session history");
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/chats/session/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete chat session");
}
