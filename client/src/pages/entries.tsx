import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MessageSquare, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Entry {
  id: number;
  title: string;
  rawThoughts: string | null;
  emotionalState: string | null;
  priority: string | null;
  status: string;
  category: string | null;
  tags: string | null;
  context: string | null;
  problem: string | null;
  rootCauses: string | null;
  desiredOutcome: string | null;
  options: string | null;
  evaluation: string | null;
  actionPlan: string | null;
  deadline: string | null;
  prediction: string | null;
  predictionConfidence: number | null;
  actualOutcome: string | null;
  outcomeRating: number | null;
  isStructured: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "inbox", label: "Inbox" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

const STATUS_STYLES: Record<string, string> = {
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

const EMOTION_EMOJI: Record<string, string> = {
  anxious: "😰",
  frustrated: "😤",
  uncertain: "🤔",
  calm: "😌",
  excited: "🔥",
  confident: "😊",
  overwhelmed: "😵",
};

const STRUCTURED_FIELDS = [
  "rawThoughts",
  "problem",
  "context",
  "desiredOutcome",
  "rootCauses",
  "options",
  "evaluation",
  "actionPlan",
  "prediction",
] as const;

function countFilledFields(entry: Entry): number {
  return STRUCTURED_FIELDS.filter((f) => {
    const val = entry[f];
    return val !== null && val !== undefined && val !== "";
  }).length;
}

function EntryDetail({
  entry,
  onContinueChat,
}: {
  entry: Entry;
  onContinueChat: () => void;
}) {
  const filled = countFilledFields(entry);

  return (
    <div className="space-y-4 pb-8">
      {/* Header info */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_STYLES[entry.status] || STATUS_STYLES.inbox}`}
        >
          {entry.status}
        </span>
        {entry.priority && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[entry.priority]}`} />
            {entry.priority}
          </span>
        )}
        {entry.emotionalState && (
          <span className="text-sm">{EMOTION_EMOJI[entry.emotionalState] || ""}</span>
        )}
        {entry.category && (
          <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">
            {entry.category}
          </span>
        )}
      </div>

      {/* Completeness */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Structured completeness</p>
          <span className="text-xs text-muted-foreground">{filled}/9 fields</span>
        </div>
        <Progress value={(filled / 9) * 100} className="h-1.5" />
      </div>

      {/* Field rows */}
      <div className="space-y-3">
        {entry.rawThoughts && (
          <FieldRow label="Raw thoughts" value={entry.rawThoughts} />
        )}
        {entry.problem && <FieldRow label="Problem / Decision" value={entry.problem} />}
        {entry.context && <FieldRow label="Context" value={entry.context} />}
        {entry.desiredOutcome && (
          <FieldRow label="Desired outcome" value={entry.desiredOutcome} />
        )}
        {entry.rootCauses && <FieldRow label="Root causes" value={entry.rootCauses} />}
        {entry.options && <FieldRow label="Options" value={entry.options} />}
        {entry.evaluation && <FieldRow label="Evaluation" value={entry.evaluation} />}
        {entry.actionPlan && <FieldRow label="Action plan" value={entry.actionPlan} />}
        {entry.prediction && (
          <FieldRow
            label={`Prediction ${entry.predictionConfidence ? `(confidence: ${entry.predictionConfidence}/10)` : ""}`}
            value={entry.prediction}
          />
        )}
        {entry.actualOutcome && (
          <FieldRow
            label={`Actual outcome ${entry.outcomeRating ? `(rating: ${entry.outcomeRating}/10)` : ""}`}
            value={entry.actualOutcome}
          />
        )}
        {entry.deadline && (
          <FieldRow label="Deadline" value={entry.deadline} />
        )}
      </div>

      <Button
        onClick={onContinueChat}
        className="w-full mt-4"
        data-testid="button-continue-chat"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Continue in Chat
      </Button>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function EntryCard({
  entry,
  onClick,
}: {
  entry: Entry;
  onClick: () => void;
}) {
  const filled = countFilledFields(entry);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border hover:border-primary/40 rounded-xl p-4 transition-colors"
      data-testid={`entry-card-${entry.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-foreground truncate flex-1">{entry.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {entry.emotionalState && (
            <span className="text-base">{EMOTION_EMOJI[entry.emotionalState] || ""}</span>
          )}
          {entry.priority && (
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_COLORS[entry.priority] || PRIORITY_COLORS.medium}`}
            />
          )}
        </div>
      </div>

      {entry.rawThoughts && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{entry.rawThoughts}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATUS_STYLES[entry.status] || STATUS_STYLES.inbox}`}
        >
          {entry.status}
        </span>
        {entry.category && (
          <span className="text-[10px] px-1.5 py-0.5 bg-secondary/60 rounded text-muted-foreground">
            {entry.category}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Completeness bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/50 rounded-full transition-all"
            style={{ width: `${(filled / 9) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{filled}/9</span>
      </div>
    </button>
  );
}

export default function EntriesPage() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (search) queryParams.set("search", search);
  if (category && category !== "all") queryParams.set("category", category);

  const { data: entries, isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries", statusFilter, search, category],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/entries?${queryParams.toString()}`);
      return res.json();
    },
  });

  const categories = entries
    ? [...new Set(entries.map((e) => e.category).filter(Boolean))]
    : [];

  const handleContinueChat = (entry: Entry) => {
    setSelectedEntry(null);
    setLocation(`/?entryId=${entry.id}`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 py-6">
        <h1 className="text-xl font-bold text-foreground mb-5">Entries</h1>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                data-testid={`filter-status-${tab.key || "all"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + Category */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries..."
                className="pl-9 h-9 text-sm"
                data-testid="input-search"
              />
            </div>
            {categories.length > 0 && (
              <Select
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger className="w-36 h-9 text-xs" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat!}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Entry list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || statusFilter || category
                ? "No entries match your filters."
                : "Your entries will appear here as you talk to the assistant."}
            </p>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedEntry && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-base font-semibold pr-6">
                  {selectedEntry.title}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Created{" "}
                  {formatDistanceToNow(new Date(selectedEntry.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </SheetHeader>
              <EntryDetail
                entry={selectedEntry}
                onContinueChat={() => handleContinueChat(selectedEntry)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
