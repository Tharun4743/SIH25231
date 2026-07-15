import React, { useState } from "react";
import { X, Flag, CheckCircle2, AlertTriangle, Send } from "lucide-react";

interface ReportIssueModalProps {
  messageId: string;
  messageText: string;
  onClose: () => void;
  onReported: () => void;
}

const REPORT_CATEGORIES = [
  { value: "inaccurate", label: "Inaccurate or Misleading", icon: "⚠️" },
  { value: "harmful", label: "Harmful or Inappropriate", icon: "🚫" },
  { value: "biased", label: "Biased or Offensive", icon: "⛔" },
  { value: "privacy", label: "Privacy Concern", icon: "🔒" },
  { value: "other", label: "Other", icon: "💬" },
];

export default function ReportIssueModal({
  messageId,
  messageText,
  onClose,
  onReported,
}: ReportIssueModalProps) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);

    // Build report object
    const report = {
      id: `report-${Date.now()}`,
      timestamp: new Date().toISOString(),
      messageId,
      category: selectedCategory,
      details: details.trim(),
      // Store a truncated preview of the reported content for context
      contentPreview: messageText.slice(0, 200),
    };

    // Save report locally (Option A: localStorage log — no backend change needed)
    try {
      const existing = JSON.parse(localStorage.getItem("aura-ai-reports") || "[]");
      existing.push(report);
      localStorage.setItem("aura-ai-reports", JSON.stringify(existing));
    } catch (_) {
      // Storage error is non-fatal — report attempt is still acknowledged
    }

    // Also attempt to POST to backend if available (non-blocking, best-effort)
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(3000),
      });
    } catch (_) {
      // Backend endpoint is optional; local storage is the primary record
    }

    setIsSubmitting(false);
    setSubmitted(true);

    // Auto-close after confirmation
    setTimeout(() => {
      onReported();
      onClose();
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-app-bg/85 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card-bg rounded-2xl w-full max-w-md shadow-2xl border border-border-default flex flex-col relative select-text overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-default/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-status-error-bg/20 border border-status-error-border/30 flex items-center justify-center">
              <Flag className="w-4 h-4 text-status-error" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary tracking-tight">
                Report AI-Generated Content
              </h3>
              <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider font-bold">
                Policy 11.16 — Content Feedback
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 hover:bg-app-bg rounded-lg transition-colors"
            aria-label="Close report dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {!submitted ? (
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Info Banner */}
            <div className="flex gap-2.5 bg-app-bg rounded-xl p-3.5 border border-border-default">
              <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Help us improve Aura by flagging AI responses that seem inaccurate, harmful, or inappropriate.
                Your feedback is stored locally and used to improve the system.
              </p>
            </div>

            {/* Content Preview */}
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Reported Response Preview
              </p>
              <div className="bg-app-bg border border-border-default rounded-xl px-4 py-3 text-[11px] text-text-secondary italic leading-relaxed max-h-20 overflow-y-auto">
                "{messageText.slice(0, 180)}{messageText.length > 180 ? "…" : ""}"
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Issue Category <span className="text-status-error">*</span>
              </p>
              <div className="flex flex-col gap-2">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      selectedCategory === cat.value
                        ? "bg-primary/10 border-primary/40 text-primary-light"
                        : "bg-app-bg border-border-default text-text-secondary hover:border-border-hover hover:bg-card-bg/60"
                    }`}
                  >
                    <span className="text-base leading-none">{cat.icon}</span>
                    {cat.label}
                    {selectedCategory === cat.value && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-light ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Details */}
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Additional Details <span className="text-text-disabled">(optional)</span>
              </p>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Briefly describe the issue with this AI response..."
                className="w-full bg-app-bg border border-border-default rounded-xl px-4 py-3 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all"
              />
              <p className="text-[10px] text-text-disabled text-right mt-1">{details.length}/500</p>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedCategory || isSubmitting}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                selectedCategory && !isSubmitting
                  ? "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 active:scale-95"
                  : "bg-card-bg text-text-disabled border border-border-default cursor-not-allowed"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting Report..." : "Submit Report"}
            </button>
          </div>
        ) : (
          /* Confirmation State */
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-status-success-bg/20 border border-status-success-border/30 flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-7 h-7 text-status-success" />
            </div>
            <div>
              <h4 className="text-sm font-black text-text-primary mb-1">Report Received</h4>
              <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
                Thank you for your feedback. This report has been logged locally and will help improve Aura's AI responses.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
