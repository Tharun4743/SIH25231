import { useEffect, useRef } from "react";
import { ChatMessage } from "../types";
import MessageBubble from "./MessageBubble";
import { Cpu, Terminal, Eye, Sparkles, LayoutGrid, Hourglass } from "lucide-react";

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onReportIssue: (messageId: string, messageText: string) => void;
}

export default function ChatWindow({ messages, isStreaming, onReportIssue }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-app-bg pt-6 pb-36 px-4 md:px-8 scroll-smooth"
    >
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        
        {messages.length === 0 ? (
          /* Empty/Initial Welcome State */
          <div className="flex flex-col items-center justify-center text-center mt-8 md:mt-12 select-none">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light mb-6 shadow-xl shadow-primary/5 animate-pulse">
              <Cpu className="w-7 h-7" />
            </div>
            
            <h2 className="font-display text-2xl font-black text-text-primary tracking-tight mb-2.5">
              Enterprise Grounded Retrieval Workspace
            </h2>
            <p className="text-xs text-text-secondary max-w-lg mb-8 leading-relaxed font-sans">
              Aura handles local sliding-window indexations, semantic diagram search vectors, and vocal transcriptions with 100% on-premises privacy.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl text-left font-sans mt-2">
              <div className="border border-border-default p-5 rounded-2xl bg-card-bg/60 hover:border-border-hover transition-all duration-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-primary-light">
                    <Terminal className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">1. Text Chunks</span>
                  </div>
                  <p className="text-xs text-text-primary font-semibold leading-snug">
                    Source Indexation
                  </p>
                  <p className="text-[11px] text-text-muted leading-normal mt-1.5">
                    Parses, splits, and maps cosine vectors for complex documents on active memory registers.
                  </p>
                </div>
              </div>

              <div className="border border-border-default p-5 rounded-2xl bg-card-bg/60 hover:border-border-hover transition-all duration-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-status-success">
                    <Eye className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">2. Computer Vision</span>
                  </div>
                  <p className="text-xs text-text-primary font-semibold leading-snug">
                    Semantic Vision
                  </p>
                  <p className="text-[11px] text-text-muted leading-normal mt-1.5">
                    Query active block schemas, drafts, and charts with simple conceptual phrases.
                  </p>
                </div>
              </div>

              <div className="border border-border-default p-5 rounded-2xl bg-card-bg/60 hover:border-border-hover transition-all duration-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-accent">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">3. Acoustic Nodes</span>
                  </div>
                  <p className="text-xs text-text-primary font-semibold leading-snug">
                    Vocal Transcript
                  </p>
                  <p className="text-[11px] text-text-muted leading-normal mt-1.5">
                    Speak into Aura via browser recording audio gates, transcribing voice commands locally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Conversation Thread */
          <div className="flex flex-col gap-6 w-full mt-4">
            <div className="flex justify-center select-none">
              <span className="text-[10px] font-bold text-text-muted bg-card-bg border border-border-default px-3.5 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-primary-light" /> Active Session Thread
              </span>
            </div>

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onReportIssue={onReportIssue} />
            ))}

            {/* Typing / Streaming State */}
            {isStreaming && (
              <div className="flex flex-col items-start w-full gap-2 select-none animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-status-success-bg/20 border border-status-success-border/30 flex items-center justify-center text-status-success">
                    <Hourglass className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Aura compiling grounded context...
                  </span>
                </div>
                
                <div className="px-5 py-4 rounded-2xl max-w-[85%] bg-card-bg border border-border-default rounded-tl-none">
                  <div className="flex gap-1.5 items-center h-4">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
