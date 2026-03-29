import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  entryId: number | null;
  metadata: string | null;
  createdAt: string;
}

interface ParsedMetadata {
  action?: string;
  title?: string;
  emotionalState?: string;
  priority?: string;
  status?: string;
  category?: string;
}

// Pending message shape (not yet persisted)
interface PendingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  entryId?: number | null;
  metadata?: string | null;
  pending?: boolean;
}

type AnyMessage = Message | PendingMessage;

const EMOTION_EMOJI: Record<string, string> = {
  anxious: "😰",
  frustrated: "😤",
  uncertain: "🤔",
  calm: "😌",
  excited: "🔥",
  confident: "😊",
  overwhelmed: "😵",
};

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  action_plan: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const SUGGESTED_PROMPTS = [
  "What's on my mind right now?",
  "I need to make a decision about...",
  "What should I focus on today?",
];

function EntryInlineCard({
  metadata,
  entryId,
}: {
  metadata: ParsedMetadata;
  entryId: number | null;
}) {
  return (
    <Link href={`/entries`}>
      <div
        className="mt-2 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition-colors cursor-pointer max-w-xs"
        data-testid={`entry-card-${entryId}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-foreground truncate flex-1">
            {metadata.title || "New entry"}
          </p>
          {metadata.emotionalState && (
            <span className="text-base leading-none shrink-0">
              {EMOTION_EMOJI[metadata.emotionalState] || ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {metadata.status && (
            <span
              className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATUS_COLORS[metadata.status] || STATUS_COLORS.inbox}`}
            >
              {metadata.status}
            </span>
          )}
          {metadata.priority && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[metadata.priority] || PRIORITY_COLORS.medium}`}
              />
              {metadata.priority}
            </span>
          )}
          {metadata.category && (
            <span className="text-[10px] text-muted-foreground">{metadata.category}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="chat-bubble-assistant px-4 py-3 max-w-xs">
        <div className="flex gap-1 items-center h-4">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: AnyMessage }) {
  const isUser = msg.role === "user";
  const isPending = "pending" in msg && msg.pending;

  let parsedMeta: ParsedMetadata | null = null;
  if (msg.metadata) {
    try {
      parsedMeta = JSON.parse(msg.metadata);
    } catch {}
  }

  const showCard =
    !isUser &&
    parsedMeta &&
    (parsedMeta.action === "create_entry" || parsedMeta.action === "update_entry") &&
    parsedMeta.title;

  const entryId = "entryId" in msg ? (msg as any).entryId : null;

  return (
    <div
      className={`flex mb-4 ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${msg.id}`}
    >
      <div className={`max-w-[70%] ${isUser ? "" : ""}`}>
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed ${
            isUser ? "chat-bubble-user" : "chat-bubble-assistant"
          } ${isPending ? "opacity-60" : ""}`}
        >
          {msg.content}
        </div>

        {showCard && parsedMeta && (
          <EntryInlineCard metadata={parsedMeta} entryId={entryId} />
        )}

        {"createdAt" in msg && msg.createdAt && (
          <p
            className={`text-[10px] text-muted-foreground mt-1 ${isUser ? "text-right" : "text-left"}`}
          >
            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [location] = useLocation();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse entryId from hash query param e.g. #/?entryId=5
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.hash.split("?")[1] || "" : ""
  );
  const urlEntryId = urlParams.get("entryId")
    ? parseInt(urlParams.get("entryId")!)
    : undefined;
  const [activeEntryId, setActiveEntryId] = useState<number | undefined>(urlEntryId);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/messages?limit=50");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { message: string; entryId?: number }) => {
      const res = await apiRequest("POST", "/api/chat", payload);
      return res.json();
    },
    onMutate: (payload) => {
      const tempId = `pending-${Date.now()}`;
      const userMsg: PendingMessage = {
        id: `user-${tempId}`,
        role: "user",
        content: payload.message,
        pending: false,
      };
      const typingMsg: PendingMessage = {
        id: `typing-${tempId}`,
        role: "assistant",
        content: "...",
        pending: true,
      };
      setPendingMessages([userMsg, typingMsg]);
      setIsTyping(true);
    },
    onSuccess: (data) => {
      setPendingMessages([]);
      setIsTyping(false);
      if (data.entryId) setActiveEntryId(data.entryId);
      qc.invalidateQueries({ queryKey: ["/api/messages"] });
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      qc.invalidateQueries({ queryKey: ["/api/entries/stats"] });
    },
    onError: () => {
      setPendingMessages([]);
      setIsTyping(false);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingMessages, scrollToBottom]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate({ message: text, entryId: activeEntryId });
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const allMessages: AnyMessage[] = [
    ...(messages || []),
    ...pendingMessages.filter((m) => !m.pending),
  ];

  const showWelcome = !isLoading && !messages?.length && !pendingMessages.length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Active entry context banner */}
      {activeEntryId && (
        <div className="shrink-0 px-4 py-2 border-b border-border bg-primary/5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Continuing entry #{activeEntryId}
          </p>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setActiveEntryId(undefined)}
          >
            Clear
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className={`h-12 ${i % 2 === 0 ? "w-48" : "w-64"} rounded-2xl`} />
              </div>
            ))}
          </div>
        ) : showWelcome ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                What's on your mind?
              </h2>
              <p className="text-sm text-muted-foreground">
                Start a conversation — I'll help you think it through, capture decisions, and track outcomes.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="text-left px-4 py-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`prompt-suggestion-${prompt.slice(0, 20)}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {allMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && pendingMessages.some((m) => m.pending) && <TypingIndicator />}
          </>
        )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-background p-4">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            rows={1}
            className="flex-1 min-h-[44px] resize-none text-sm leading-relaxed py-3 bg-card border-border focus-visible:ring-primary/50"
            data-testid="input-message"
            disabled={sendMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            size="icon"
            className="h-11 w-11 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
