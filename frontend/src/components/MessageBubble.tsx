import React, { useState } from "react";
import { ChatMessage } from "../types";
import { ChevronDown, ChevronRight, FileCheck, Calendar, User, Cpu } from "lucide-react";
import SourceCard from "./SourceCard";

interface MessageBubbleProps {
  message: ChatMessage;
  key?: string | number;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(true);
  const isUser = message.role === "user";

  // Simple and highly robust regex parser for Markdown blocks (Bold, Lists, Code)
  const formatText = (txt: string) => {
    if (!txt) return "";
    
    const lines = txt.split("\n");
    const elements: React.ReactNode[] = [];
    
    let currentBulletList: { key: string; items: string[] } | null = null;
    let currentNumberedList: { key: string; items: string[] } | null = null;
    let inCodeBlock = false;
    let codeContent: string[] = [];

    const flushBulletList = (key: string) => {
      if (currentBulletList) {
        elements.push(
          <ul key={currentBulletList.key} className="list-disc ml-6 my-2 space-y-1.5 select-text">
            {currentBulletList.items.map((item, i) => (
              <li key={i} className="text-xs md:text-sm leading-relaxed">
                {parseInlineStyles(item)}
              </li>
            ))}
          </ul>
        );
        currentBulletList = null;
      }
    };

    const flushNumberedList = (key: string) => {
      if (currentNumberedList) {
        elements.push(
          <ol key={currentNumberedList.key} className="list-decimal ml-6 my-2 space-y-1.5 select-text">
            {currentNumberedList.items.map((item, i) => (
              <li key={i} className="text-xs md:text-sm leading-relaxed">
                {parseInlineStyles(item)}
              </li>
            ))}
          </ol>
        );
        currentNumberedList = null;
      }
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // Handle Code Block blocks
      if (line.startsWith("```")) {
        // Flush any active lists first
        flushBulletList(`bullet-pre-code-${idx}`);
        flushNumberedList(`num-pre-code-${idx}`);

        if (inCodeBlock) {
          inCodeBlock = false;
          const content = codeContent.join("\n");
          codeContent = [];
          elements.push(
            <div key={`code-${idx}`} className="my-3 font-mono text-[11px] bg-app-bg text-text-secondary p-3.5 rounded-xl border border-border-default overflow-x-auto select-text leading-relaxed">
              <pre><code>{content}</code></pre>
            </div>
          );
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Handle Bullet lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        flushNumberedList(`num-pre-bullet-${idx}`);
        const itemText = line.replace(/^[-*]\s+/, "");
        if (!currentBulletList) {
          currentBulletList = { key: `bullet-list-${idx}`, items: [] };
        }
        currentBulletList.items.push(itemText);
        continue;
      }

      // Handle Numbered lists
      const numberedListMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numberedListMatch) {
        flushBulletList(`bullet-pre-num-${idx}`);
        const itemText = numberedListMatch[2];
        if (!currentNumberedList) {
          currentNumberedList = { key: `num-list-${idx}`, items: [] };
        }
        currentNumberedList.items.push(itemText);
        continue;
      }

      // Handle empty lines or spacing
      if (line.trim() === "") {
        flushBulletList(`bullet-empty-${idx}`);
        flushNumberedList(`num-empty-${idx}`);
        continue;
      }

      // Standard text line
      flushBulletList(`bullet-text-${idx}`);
      flushNumberedList(`num-text-${idx}`);
      elements.push(
        <p key={idx} className="text-xs md:text-sm leading-relaxed mt-1 select-text">
          {parseInlineStyles(line)}
        </p>
      );
    }

    // Flush any remaining lists at the end
    flushBulletList("bullet-end");
    flushNumberedList("num-end");

    return elements;
  };

  // Parse Bold text and backticks
  const parseInlineStyles = (lineText: string) => {
    const parts = lineText.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-extrabold text-text-primary">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index} className="font-mono text-[11px] bg-app-bg px-1.5 py-0.5 rounded text-primary-light border border-border-default">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className={`flex flex-col w-full ${isUser ? "items-end" : "items-start"} gap-2`}>
      {/* Sender Header */}
      <div className="flex items-center gap-2 select-none">
        {isUser ? (
          <>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{message.timestamp || "Just Now"}</span>
            <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light">
              <User className="w-3.5 h-3.5" />
            </div>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-lg bg-status-success-bg/20 border border-status-success/30 flex items-center justify-center text-status-success">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span className="text-[10px] text-status-success font-bold uppercase tracking-wider">Aura Kernel</span>
            <span className="text-[10px] text-text-muted">• {message.timestamp || "Active"}</span>
          </>
        )}
      </div>

      {/* Bubble Box */}
      <div
        className={`rounded-2xl transition-all duration-200 border ${
          isUser
            ? "bg-primary hover:bg-primary-hover border-primary/30 text-white rounded-tr-none p-4.5 max-w-[80%] md:max-w-[70%] shadow-lg shadow-primary/10"
            : "bg-card-bg hover:bg-card-bg/90 border-border-default text-text-primary rounded-tl-none p-5 max-w-[90%] md:max-w-[85%] shadow-md"
        }`}
      >
        {/* Render Text / Markdown */}
        <div className={`space-y-1.5 ${isUser ? "text-white" : "text-text-secondary"}`}>
          {formatText(message.text)}
        </div>

        {/* Cited Sources for Assistant Response */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 border-t border-border-default/80 pt-4">
            {/* Collapse Trigger */}
            <button
              type="button"
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer select-none group focus:outline-none"
              onClick={() => setShowSources(!showSources)}
            >
              {showSources ? (
                <ChevronDown className="w-4 h-4 text-text-muted group-hover:scale-110 transition-transform" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-status-success" />
                {message.sources.length} {message.sources.length === 1 ? "Source" : "Sources"} Grounded
              </span>
            </button>

            {/* Citations Grid */}
            {showSources && (
              <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {message.sources.map((source, idx) => (
                  <SourceCard key={idx} source={source} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
