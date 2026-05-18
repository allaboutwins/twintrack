import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, RotateCcw, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTION_CHIPS = [
  { label: "💤 Sync twin naps", prompt: "How do I sync my twins' nap schedule? They keep waking each other up." },
  { label: "🍼 Feeding twins", prompt: "What are tips for tandem feeding twins? Any advice for bottle feeding two babies at once?" },
  { label: "🏥 NICU support", prompt: "My twins are in the NICU. What should I know and how can I support them?" },
  { label: "📅 Twin schedules", prompt: "What does a good daily schedule look like for twin babies?" },
  { label: "💪 Mental load", prompt: "I'm feeling overwhelmed and exhausted with twins. How do other twin parents cope?" },
  { label: "🥛 Pumping support", prompt: "I'm pumping for two babies. How do I maintain my milk supply for twins?" },
  { label: "🌙 Bedtime routine", prompt: "What's a good bedtime routine for twins that actually works?" },
  { label: "📏 Adjusted age", prompt: "How do adjusted age and corrected age work for premature twins?" },
];

const DISCLAIMER =
  "Twin AI is here for peer support and general information — not medical advice. Always consult your pediatrician or healthcare provider for medical guidance.";

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} className="text-primary" />
      </div>
      <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-primary" />
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-primary text-white rounded-br-sm"
            : "bg-white border border-border text-foreground rounded-bl-sm"
        }`}
      >
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TwinAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setStreamError(null);
    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";

    try {
      const res = await fetch("/api/twin-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to connect to Twin AI");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (!payload.trim()) continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.done) break;
            if (parsed.error) {
              setStreamError(parsed.error);
              break;
            }
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setStreamError("Twin AI is taking a breather 💕 Please try again in a moment.");
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setStreamError(null);
    setIsStreaming(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const showSuggestions = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-6 pb-4 bg-white border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Twin AI</h1>
              <p className="text-xs text-muted-foreground">Your twin parenting companion 💕</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              aria-label="New conversation"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {showSuggestions ? (
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              Hi there, twin parent! 👋
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-[280px]">
              I'm here to support you through every nap, feed, and milestone. Ask me anything about raising multiples.
            </p>

            <div className="w-full">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                Common questions
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => sendMessage(chip.prompt)}
                    className="px-3.5 py-2 rounded-full bg-white border border-border text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] transition-all shadow-sm"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex gap-2.5">
              <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{DISCLAIMER}</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
          </>
        )}

        {streamError && (
          <div className="flex gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80">
            <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{streamError}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer (in-chat) */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/60 flex gap-2">
          <AlertCircle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-600 leading-relaxed">{DISCLAIMER}</p>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-24 pt-2 bg-white border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about twins…"
              rows={1}
              disabled={isStreaming}
              className="w-full px-4 py-3 pr-4 rounded-2xl bg-muted/40 border border-border text-sm outline-none focus:ring-2 ring-primary/30 resize-none leading-relaxed transition-all disabled:opacity-60"
              style={{ minHeight: 44 }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all shadow-sm"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
