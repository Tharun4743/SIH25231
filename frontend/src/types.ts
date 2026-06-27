export interface SourceCitation {
  docId: string;
  docName: string;
  pageNumber: number;
  excerpt: string;
  score: number; // Relevance matching score, e.g. 98%
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: SourceCitation[];
}

export interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  pageCount: number;
}

export interface AudioSegment {
  start: number;
  end: number;
  text: string;
}

export interface AudioTranscriptionResult {
  transcript: string;
  segments: AudioSegment[];
  simulated?: boolean;
  error?: string;
}

export interface ImageSearchResult {
  id: string;
  name: string;
  score: number;
  url: string;
  description: string;
}
