"use client";

import React, { useState } from "react";
import { X, FileText, Clipboard, Check, Scale } from "lucide-react";

interface Citation {
  document_id: number;
  document_title: string;
  page_number: number;
  text: string;
  score: number;
}

interface CitationViewerProps {
  citation: Citation | null;
  onClose: () => void;
}

export default function CitationViewer({ citation, onClose }: CitationViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  // Format relevance score as percentage
  const formattedScore = (citation.score * 100).toFixed(1);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `"${citation.text}"\nSource: ${citation.document_title}, Page ${citation.page_number}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 border-l border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col h-full shrink-0 shadow-lg relative z-20">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-850 shrink-0">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand" />
          Citation Details
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body content scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Source metadata card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-950 dark:border-slate-850 space-y-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Document Reference
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {citation.document_title}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Page Index
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                Page {citation.page_number}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Similarity Score
              </span>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" />
                {formattedScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Text chunk block */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
            Grounded Reference Text
          </span>
          <div className="p-4 rounded-lg bg-teal-50/30 border border-teal-200/40 text-xs text-slate-700 dark:bg-teal-950/10 dark:border-teal-900/40 dark:text-slate-300 leading-relaxed font-sans select-text italic">
            "{citation.text}"
          </div>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-slate-850 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Copied to clipboard
            </>
          ) : (
            <>
              <Clipboard className="w-3.5 h-3.5 text-slate-400" />
              Copy formatted quote
            </>
          )}
        </button>
      </div>
    </div>
  );
}
