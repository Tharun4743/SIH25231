import { useState } from "react";
import { SourceCitation } from "../types";
import { ChevronDown, ChevronUp, FileSpreadsheet, Percent } from "lucide-react";

interface SourceCardProps {
  source: SourceCitation;
  key?: string | number;
}

export default function SourceCard({ source }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="p-3.5 border border-border-default rounded-xl bg-app-bg hover:bg-app-bg/85 hover:border-border-hover transition-all duration-200 cursor-pointer shadow-sm select-text"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex justify-between items-center select-none">
        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
          <FileSpreadsheet className="w-3.5 h-3.5 text-primary-light" /> Grounded Chunk
        </span>
        <span className="px-2 py-0.5 bg-status-success-bg text-status-success border border-status-success-border/30 text-[9px] font-bold rounded-full flex items-center gap-0.5">
          <Percent className="w-2.5 h-2.5" />
          {source.score}% Match
        </span>
      </div>

      <p className={`text-xs text-text-secondary italic leading-relaxed mt-2.5 border-l-2 border-border-default pl-3.5 font-sans ${
        isExpanded ? "" : "line-clamp-2"
      }`}>
        "...{source.excerpt}..."
      </p>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-border-default/55 select-none">
        <span className="text-[10px] text-primary-light font-bold truncate max-w-[150px]" title={source.docName}>
          {source.docName}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted font-semibold">
            Page {source.pageNumber}
          </span>
          <span className="text-text-secondary p-0.5 hover:bg-card-bg rounded">
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
