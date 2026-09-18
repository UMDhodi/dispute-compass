"use client";

import { useState, useRef } from "react";
import { FileUpload } from "@/components/file-upload";
import { DisclaimerBanner, InlineDisclaimer } from "@/components/disclaimer-banner";
import { MessageSquare, Loader2, AlertCircle, Send, User, Bot, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface QAResult {
  answer: string;
  relevantClauses: string[];
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  followUpSuggestions: string[];
  disclaimer: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  result?: QAResult;
}

const confidenceColor = {
  high: "var(--risk-safe)",
  medium: "var(--risk-warning)",
  low: "var(--text-muted)",
};

const sampleQuestions = [
  "What is the notice period required to terminate this agreement?",
  "Am I liable for damages if I leave early?",
  "What fees can the other party charge?",
  "Does this document include an arbitration clause?",
];

export default function QAPage() {
  const [documentText, setDocumentText] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleAsk = async (q?: string) => {
    const qText = q ?? question;
    if (!qText.trim() || !documentText.trim() || loading) return;

    const userMsg: Message = { role: "user", content: qText };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qText, documentText }),
      });
      const data = await res.json() as { result?: QAResult; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Q&A failed");
      setMessages((prev) => [...prev, { role: "assistant", content: data.result?.answer ?? "", result: data.result }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: "var(--brand-100)" }}>
            <MessageSquare size={20} style={{ color: "var(--brand-600)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-geist-sans), Inter", color: "var(--text-primary)" }}>
              Document Q&A Copilot
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ask questions — get answers grounded in your document</p>
          </div>
        </div>
        <DisclaimerBanner />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Document panel */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Load Your Document</h2>
            <FileUpload
              onTextExtracted={(text) => { setDocumentText(text); setMessages([]); }}
              label="Upload Document"
              className="mb-3"
            />
            <textarea
              className="w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: "200px", background: "var(--surface)" }}
              placeholder="Or paste your document text here…"
              value={documentText}
              onChange={(e) => { setDocumentText(e.target.value); setMessages([]); }}
              aria-label="Document text"
            />
            <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>{documentText.length.toLocaleString()} chars</p>

            {documentText.trim().length > 50 && (
              <div className="mt-4">
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Sample questions:</p>
                <div className="flex flex-col gap-1.5">
                  {sampleQuestions.map((sq) => (
                    <button
                      key={sq}
                      onClick={() => handleAsk(sq)}
                      disabled={loading}
                      className="text-left text-xs px-3 py-2 rounded-[var(--radius-sm)] transition-colors"
                      style={{ background: "var(--brand-50)", color: "var(--brand-600)", border: "1px solid var(--brand-200)" }}
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="card flex flex-col" style={{ minHeight: "500px" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5" style={{ maxHeight: "450px" }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center" style={{ minHeight: "200px" }}>
                  <MessageSquare size={40} style={{ color: "var(--border)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {documentText.trim().length > 50
                      ? "Ask any question about your document"
                      : "Load a document first, then ask questions about it"}
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("flex gap-3 mb-5", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--brand-50)" }}>
                      <Bot size={16} style={{ color: "var(--brand-500)" }} />
                    </div>
                  )}
                  <div className={cn("max-w-[85%] flex flex-col gap-2")}>
                    <div
                      className="rounded-[var(--radius-md)] px-4 py-3 text-sm"
                      style={msg.role === "user"
                        ? { background: "var(--brand-500)", color: "white" }
                        : { background: "var(--surface-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                      }
                    >
                      {msg.content}
                    </div>

                    {/* Assistant extras */}
                    {msg.result && msg.role === "assistant" && (
                      <div className="flex flex-col gap-2">
                        {msg.result.relevantClauses.length > 0 && (
                          <div className="px-4 py-3 rounded-[var(--radius-sm)]" style={{ background: "var(--brand-50)", border: "1px solid var(--brand-200)" }}>
                            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: "var(--brand-600)" }}>
                              <Quote size={11} /> Relevant clauses
                            </p>
                            {msg.result.relevantClauses.map((c, ci) => (
                              <p key={ci} className="text-xs italic" style={{ color: "var(--text-secondary)" }}>"{c}"</p>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Confidence:</span>
                          <span className="text-xs font-medium" style={{ color: confidenceColor[msg.result.confidence] }}>
                            {msg.result.confidence}
                          </span>
                        </div>
                        {msg.result.followUpSuggestions.length > 0 && (
                          <div>
                            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Follow-up questions:</p>
                            {msg.result.followUpSuggestions.map((s, si) => (
                              <button
                                key={si}
                                onClick={() => handleAsk(s)}
                                disabled={loading}
                                className="block text-left text-xs mt-1 hover:underline"
                                style={{ color: "var(--brand-500)" }}
                              >
                                → {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}>
                      <User size={16} style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--brand-50)" }}>
                    <Bot size={16} style={{ color: "var(--brand-500)" }} />
                  </div>
                  <div className="rounded-[var(--radius-md)] px-4 py-3" style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}>
                    <div className="flex gap-1.5">
                      {[0, 0.2, 0.4].map((d) => (
                        <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--brand-500)", animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
              {error && (
                <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--risk-critical)" }}>
                  <AlertCircle size={12} /> {error}
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  className="flex-1 rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)", minHeight: "44px", maxHeight: "120px" }}
                  placeholder={documentText.trim().length > 50 ? "Ask a question about your document… (Enter to send)" : "Load a document first"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || documentText.trim().length < 50}
                  rows={1}
                  aria-label="Question input"
                />
                <button
                  onClick={() => handleAsk()}
                  disabled={loading || !question.trim() || documentText.trim().length < 50}
                  className="flex-shrink-0 w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-white disabled:opacity-40 transition-colors"
                  style={{ background: "var(--brand-500)" }}
                  aria-label="Send question"
                >
                  <Send size={16} />
                </button>
              </div>
              <InlineDisclaimer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
