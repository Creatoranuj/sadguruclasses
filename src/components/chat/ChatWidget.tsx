import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X, Send, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import logoIcon from "@/assets/branding/logo_icon_web.png";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  id: string;
  feedbackGiven?: "up" | "down" | null;
  queryType?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const QUICK_PROMPTS = [
  "📚 Kaunsa course lun?",
  "📝 Mock test mein help chahiye",
  "🎯 Enroll kaise karein?",
  "🔥 NEET Physics syllabus batao",
];

const WELCOME_MSG = "👋 नमस्ते! मैं **Sadguru Sarthi** हूँ – आपका 24×7 personal learning assistant। ✨\n\nमैं आपकी मदद कर सकता हूँ:\n- 📚 **Courses** और **Syllabus** के बारे में\n- 📝 **Mock Test** doubts में guidance\n- 🎯 **Study tips** और **mnemonics**\n- 🔧 **Platform** की technical help\n\nआज मैं आपके लिए क्या कर सकता हूँ?";

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MSG, timestamp: new Date(), id: "welcome", feedbackGiven: null },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    setInput("");

    const userMsgId = crypto.randomUUID();
    const userMsg: Message = { role: "user", content: msg, timestamp: new Date(), id: userMsgId };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ message: msg, history, userId: user?.id, sessionId }),
      });

      const data = await response.json();
      const botReply = data.response || "माफ़ करें, कुछ गड़बड़ हो गई। फिर try करें। 🙏";

      setMessages(prev => [...prev, {
        role: "assistant",
        content: botReply,
        timestamp: new Date(),
        id: crypto.randomUUID(),
        feedbackGiven: null,
        queryType: data.queryType,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "🔧 Connection में problem है। थोड़ी देर बाद try करें। 🙏",
        timestamp: new Date(),
        id: crypto.randomUUID(),
        feedbackGiven: null,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = useCallback(async (msgId: string, rating: "up" | "down") => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.feedbackGiven) return;

    // Find the preceding user message
    const msgIndex = messages.findIndex(m => m.id === msgId);
    const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedbackGiven: rating } : m));

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          message: "_feedback_",
          feedback: {
            messageContent: userMsg?.content || "",
            responseContent: msg.content,
            rating,
          },
          userId: user?.id,
          sessionId,
        }),
      });
    } catch {
      // Silently fail on feedback errors
    }
  }, [messages, user, sessionId]);

  const resetChat = () => {
    setMessages([{
      role: "assistant",
      content: "👋 नमस्ते! मैं **Sadguru Sarthi** हूँ – नई बातचीत शुरू करते हैं! आज मैं आपकी कैसे मदद कर सकता हूँ? 🎓",
      timestamp: new Date(),
      id: "welcome-reset",
      feedbackGiven: null,
    }]);
  };

  const MarkdownMessage = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1.5 text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
        p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        a: ({ href, children }) => <a href={href} className="underline text-primary" target="_blank" rel="noopener noreferrer">{children}</a>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded-md border">
            <table className="text-xs w-full">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
        th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold border-b">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1.5 border-b border-border/50">{children}</td>,
        tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-1">{children}</blockquote>,
        code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6",
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center",
          "bg-primary text-primary-foreground transition-all duration-200",
          "hover:scale-110 active:scale-95",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        aria-label="Open Sadguru Sarthi"
      >
        <img src={logoIcon} className="w-8 h-8 object-contain" alt="Sadguru Sarthi" />
      </button>

      {/* Full-page chat overlay */}
      {isOpen && (
        <div className={cn(
          "fixed inset-0 z-50",
          "bg-background flex flex-col",
          "animate-in fade-in duration-200",
          "md:left-auto md:w-[440px] md:shadow-2xl md:border-l"
        )}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-primary/5 shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center relative shrink-0">
              <img src={logoIcon} className="w-5 h-5 object-contain" alt="Sarthi" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-chart-2 rounded-full border-2 border-card" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Sadguru Sarthi 2.0 🎓</p>
              <p className="text-xs text-muted-foreground">सीखने का सच्चा साथी • 24×7 उपलब्ध</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={resetChat} title="Reset chat">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setIsOpen(false)} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-3 pb-2">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <img src={logoIcon} className="w-4 h-4 object-contain" alt="Sarthi" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[82%]">
                    <div className={cn(
                      "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}>
                      {msg.role === "assistant" ? <MarkdownMessage content={msg.content} /> : msg.content}
                    </div>
                    {/* Feedback buttons for assistant messages (not welcome) */}
                    {msg.role === "assistant" && msg.id !== "welcome" && msg.id !== "welcome-reset" && (
                      <div className="flex gap-1 pl-1">
                        <button
                          onClick={() => handleFeedback(msg.id, "up")}
                          disabled={!!msg.feedbackGiven}
                          className={cn(
                            "p-1 rounded-md transition-colors text-xs flex items-center gap-0.5",
                            msg.feedbackGiven === "up"
                              ? "text-primary bg-primary/15"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                          )}
                          title="Helpful"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, "down")}
                          disabled={!!msg.feedbackGiven}
                          className={cn(
                            "p-1 rounded-md transition-colors text-xs flex items-center gap-0.5",
                            msg.feedbackGiven === "down"
                              ? "text-destructive bg-destructive/15"
                              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          )}
                          title="Not helpful"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                        {msg.feedbackGiven && (
                          <span className="text-xs text-muted-foreground self-center ml-1">
                            {msg.feedbackGiven === "up" ? "शुक्रिया! 😊" : "समझ गया, बेहतर करेंगे 🙏"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Animated typing indicator */}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <img src={logoIcon} className="w-4 h-4 object-contain" alt="Sarthi" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick prompts (first message only) */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 hover:bg-primary/20 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t flex gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Sarthi se kuch poochein... 🙏"
              className="flex-1 text-sm h-10"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
