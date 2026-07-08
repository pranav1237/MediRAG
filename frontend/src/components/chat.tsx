"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2, 
  Plus,
  MessageSquare,
  Bookmark,
  Check,
  AlertTriangle,
  Sparkles,
  ShieldCheck
} from "lucide-react";

interface Citation {
  document_id: number;
  document_title: string;
  page_number: number;
  text: string;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  queryId?: number;
  citations?: Citation[];
  feedback?: { score: number; comment?: string };
}

interface ChatViewProps {
  apiBaseUrl: string;
  token: string;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  onSelectCitation: (citation: Citation) => void;
  userRole: string;
  refreshHistory: () => void;
  history: any[];
  loadSelectedHistory: (item: any) => void;
}

export default function ChatView({
  apiBaseUrl,
  token,
  activeConversationId,
  setActiveConversationId,
  onSelectCitation,
  userRole,
  refreshHistory,
  history,
  loadSelectedHistory
}: ChatViewProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Feedback popup state
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Suggested clinical queries
  const clinicalSuggestions = [
    {
      title: "Hypertension Guidelines",
      query: "What is the first-line treatment for stage 1 hypertension?",
    },
    {
      title: "Medication Admin SOP",
      query: "What is the standard protocol for clinical handovers between nursing shifts?",
    },
    {
      title: "Cardiac Arrest protocol",
      query: "What are the escalation procedures in case of acute respiratory failure?",
    }
  ];

  useEffect(() => {
    // Scroll to bottom on new message
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load selected historical chat if provided
  useEffect(() => {
    if (activeConversationId && history.length > 0) {
      const match = history.find(h => String(h.id) === String(activeConversationId));
      if (match) {
        // Map history to local messages
        const userMsg: Message = {
          id: `hist-q-${match.id}`,
          role: "user",
          content: match.question,
          timestamp: new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        // Map feedbacks if any
        const feed = match.feedbacks && match.feedbacks.length > 0 ? match.feedbacks[0] : undefined;

        const assistantMsg: Message = {
          id: `hist-a-${match.id}`,
          role: "assistant",
          content: match.response,
          timestamp: new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          queryId: match.id,
          feedback: feed ? { score: feed.score, comment: feed.comment } : undefined
        };

        // Fetch citations for assistantMsg from search endpoint or mock
        // For historical queries, we can extract references or load empty list.
        // We parse inline citation blocks to make them clickable.
        setMessages([userMsg, assistantMsg]);
        setErrorMessage(null);
      }
    }
  }, [activeConversationId, history]);

  // Start a new chat session
  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setErrorMessage(null);
    setQuestion("");
  };

  // Submit Query to FastAPI backend
  const handleSend = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);

    // Create user message object
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setQuestion("");

    try {
      const response = await fetch(`${apiBaseUrl}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          question: text,
          top_k: 5
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to fetch response from clinical engine.");
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: `assistant-${data.query_id}`,
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        queryId: data.query_id,
        citations: data.citations
      };

      setMessages(prev => [...prev, assistantMsg]);
      refreshHistory(); // Refresh sidebar index
      if (!activeConversationId) {
        setActiveConversationId(String(data.query_id));
      }
    } catch (error: any) {
      console.error("Query Error:", error);
      setErrorMessage(error.message || "An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Parse response content to render clinical citation highlights
  const renderMessageContent = (msg: Message) => {
    if (msg.role === "user") {
      return <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
    }

    const text = msg.content;
    // Regex matches patterns like [Guideline Title, p. 12] or [Guideline, p.12]
    const citationRegex = /\[([^\]]+?),\s*p\.\s*(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add text before match
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const docTitle = match[1];
      const pageNum = parseInt(match[2], 10);

      // Check if we can find citation details in the citations list
      const citationObj = msg.citations?.find(
        c => c.document_title.toLowerCase().includes(docTitle.toLowerCase()) || 
             docTitle.toLowerCase().includes(c.document_title.toLowerCase())
      ) || {
        document_id: 0,
        document_title: docTitle,
        page_number: pageNum,
        text: "Excerpt details not stored.",
        score: 1.0
      };

      parts.push(
        <button
          key={`cit-${matchIndex}`}
          onClick={() => onSelectCitation(citationObj as Citation)}
          className="mx-1 px-2 py-0.5 inline-flex items-center gap-1 text-xs font-semibold rounded bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 hover:text-teal-800 transition-colors cursor-pointer dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-900/60"
          title="Click to view full medical citation details"
        >
          <Bookmark className="w-3 h-3" />
          {docTitle} (p. {pageNum})
        </button>
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed space-y-2">
        {parts.length > 0 ? parts : text}
        {msg.citations && msg.citations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block mb-2">VERIFIED EVIDENCE SOURCES:</span>
            <div className="flex flex-wrap gap-2">
              {msg.citations.map((c, idx) => (
                <button
                  key={`src-btn-${idx}`}
                  onClick={() => onSelectCitation(c)}
                  className="px-2 py-1 text-xs text-left bg-slate-50 hover:bg-slate-100 text-slate-600 rounded border border-slate-200 flex items-center gap-1.5 transition-all dark:bg-slate-900 dark:hover:bg-slate-850 dark:border-slate-800 dark:text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                  <span className="font-medium truncate max-w-[120px]">{c.document_title}</span>
                  <span className="text-slate-400">Page {c.page_number}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Submit User Feedback (Rating)
  const handleFeedback = async (messageId: string, queryId: number, score: number) => {
    setFeedbackScore(score);
    setFeedbackMessageId(messageId);
    setFeedbackComment("");
    
    // Auto-submit positive, trigger comment block for negative
    if (score === 1) {
      await submitFeedbackAPI(queryId, 1, "");
    }
  };

  const submitFeedbackAPI = async (queryId: number, score: number, commentText: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/chat/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          query_id: queryId,
          score: score,
          comment: commentText || null
        })
      });

      if (response.ok) {
        // Update local state to reflect rating
        setMessages(prev => prev.map(msg => {
          if (msg.queryId === queryId) {
            return {
              ...msg,
              feedback: { score, comment: commentText }
            };
          }
          return msg;
        }));
        setFeedbackMessageId(null);
        refreshHistory(); // Update rating state in sidebar list
      }
    } catch (err) {
      console.error("Error submitting rating:", err);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Upper header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="rounded-2xl bg-brand p-2 shadow-lg shadow-teal-500/20">
              <Bot className="w-4 h-4 text-brand-text" />
            </div>
            Clinical Knowledge Engine
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700 dark:bg-teal-950/20 dark:text-teal-300">
              <ShieldCheck className="w-3 h-3" /> Grounded mode
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Sparkles className="w-3 h-3" /> Evidence-linked answers
            </span>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-850"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>

      {/* Main chat box thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center space-y-8 py-10 text-center">
            <div className="card-3d rounded-[2rem] border border-white/50 bg-white/80 p-5 shadow-2xl shadow-teal-500/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
              <div className="rounded-full bg-teal-50 p-4 text-brand ring-8 ring-teal-50/50 dark:bg-teal-950/20 dark:ring-teal-950/5">
                <Bot className="h-10 w-10 animate-pulse-soft" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Welcome to MediRAG
              </h3>
              <p className="max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Ask treatment directions, hospital protocols, or medication guidance. Each answer is assembled from indexed medical documents with source-backed citations.
              </p>
            </div>

            <div className="glass-card w-full rounded-[1.5rem] p-4">
              <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>Suggested clinical prompts</span>
                <span className="rounded-full bg-brand/10 px-2 py-1 text-brand">Fast-start</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {clinicalSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.query)}
                    className="card-3d rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition-all hover:border-brand/40 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                      {item.title}
                    </span>
                    <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                      “{item.query}”
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm dark:bg-teal-500">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`msg-bubble max-w-[85%] rounded-2xl px-5 py-4 ${
                  msg.role === "user" 
                    ? "rounded-br-none bg-slate-850 text-white shadow-lg shadow-slate-900/10 dark:bg-slate-800" 
                    : "rounded-bl-none border border-slate-200 bg-white text-slate-800 shadow-lg shadow-slate-200/60 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-100"
                }`}>
                  {/* Message body */}
                  {renderMessageContent(msg)}

                  {/* Date/Actions wrapper */}
                  <div className="mt-3 flex items-center justify-between gap-4 text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{msg.timestamp}</span>
                    
                    {msg.role === "assistant" && msg.queryId && (
                      <div className="flex items-center gap-3">
                        {msg.feedback ? (
                          <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                            {msg.feedback.score === 1 ? (
                              <ThumbsUp className="w-3.5 h-3.5 fill-teal-500 text-teal-600 dark:fill-teal-400/20 dark:text-teal-400" />
                            ) : (
                              <ThumbsDown className="w-3.5 h-3.5 fill-rose-500 text-rose-600 dark:fill-rose-400/20 dark:text-rose-400" />
                            )}
                            {msg.feedback.score === 1 ? "Positive Rating" : "Negative Rating"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleFeedback(msg.id, msg.queryId!, 1)}
                              className="p-1 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Helpful Answer"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                             </button>
                             <button
                               onClick={() => handleFeedback(msg.id, msg.queryId!, 0)}
                                className="p-1 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Unhelpful or Hallucinated Answer"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Feedback comments input area if thumbs-down clicked */}
                  {feedbackMessageId === msg.id && feedbackScore === 0 && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 dark:bg-slate-950 dark:border-slate-800">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                        Why was this answer unhelpful?
                      </label>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Provide details (e.g. wrong citation, missing information, clinical error)..."
                        rows={2}
                        className="w-full text-xs p-2 border border-slate-200 rounded focus:border-brand focus:outline-none dark:border-slate-800 dark:bg-slate-900"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setFeedbackMessageId(null)}
                          className="px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitFeedbackAPI(msg.queryId!, 0, feedbackComment)}
                          className="px-2 py-1 text-[10px] bg-brand text-brand-text hover:bg-brand-hover rounded transition-colors cursor-pointer"
                        >
                          Submit Review
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Error notifications */}
            {errorMessage && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block">Medical Retrieval Failed</span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Typing Loader state */}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm dark:bg-teal-500">
                  <Bot className="w-4 h-4 animate-pulse-soft" />
                </div>
                
                <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-white border border-slate-200 rounded-bl-none shadow-xs dark:bg-slate-900 dark:border-slate-850 flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  <span className="text-xs animate-pulse">Retrieving reference guidelines and formulating response...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input panel box */}
      <div className="border-t border-slate-200 bg-white/80 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(question);
          }}
          className="relative mx-auto flex max-w-3xl items-center gap-3"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            placeholder={
              isLoading 
                ? "Waiting for generation engine..." 
                : userRole === "student" 
                  ? "Ask clinical/educational queries..." 
                  : "Ask anything about treatment guidelines or hospital SOPs..."
            }
            className="input-glow flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm shadow-inner shadow-slate-100 transition-all focus:border-brand dark:border-slate-850 dark:bg-slate-950 dark:shadow-slate-950 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="absolute right-2.5 rounded-xl bg-brand p-2 text-brand-text shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          This clinical search uses retrieved medical knowledge and does not replace professional medical diagnosis.
        </p>
      </div>
    </div>
  );
}
