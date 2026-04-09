import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { streamAiChat, type ChatTurn } from "@/lib/ai-chat-stream";
import { useChatListingContext } from "@/contexts/ChatListingContext";
import { toast } from "sonner";

const INTRO: ChatTurn = {
  role: "assistant",
  content: "Hi! I'm JobSeeker AI—ask about the site, jobs, or your search.",
};

export function JobSeekerChatWidget() {
  const location = useLocation();
  const { listingContext } = useChatListingContext();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([INTRO]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hidden = location.pathname.startsWith("/admin");

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, streaming, scrollToBottom]);

  const stopStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const contextParts = [`Path: ${location.pathname}`];
    if (typeof document !== "undefined" && document.title) {
      contextParts.push(`Title: ${document.title}`);
    }
    if (listingContext) {
      contextParts.push("");
      contextParts.push(listingContext);
    }
    const context = contextParts.join("\n");

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const apiMessages = history.map(({ role, content }) => ({ role, content }));

    try {
      await streamAiChat(apiMessages, {
        context,
        signal: ac.signal,
        onDelta: (chunk) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { role: "assistant", content: last.content + chunk };
            }
            return next;
          });
        },
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            next[next.length - 1] = {
              role: "assistant",
              content: "(Stopped.)",
            };
          }
          return next;
        });
      } else {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        toast.error(msg);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            next.pop();
          }
          return next;
        });
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (hidden) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open chat"
          className={cn(
            "fixed z-[150] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg",
            "hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:right-6",
          )}
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed z-[160] flex h-[min(560px,calc(100dvh-5.5rem))] w-[min(100vw-2rem,400px)] flex-col rounded-2xl border border-border bg-background shadow-2xl",
            "bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:right-6",
          )}
          role="dialog"
          aria-label="JobSeeker chat"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-sm">JobSeeker AI</p>
              <p className="truncate text-xs text-muted-foreground">Help with the website & job search</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-3 pr-1">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm",
                    m.role === "user" ? "ml-6 bg-accent/15 text-foreground" : "mr-4 bg-muted/60 text-foreground",
                  )}
                >
                  {m.role === "assistant" &&
                  m.content === "" &&
                  streaming &&
                  i === messages.length - 1 ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Thinking…
                    </span>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t p-3 space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about the site or job search…"
              rows={2}
              disabled={streaming}
              className="min-h-[72px] resize-none text-sm"
            />
            <div className="flex justify-end gap-2">
              {streaming ? (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={stopStream}>
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={streaming || !input.trim()}
                onClick={() => void handleSend()}
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
