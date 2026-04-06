import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import { EntryCard } from "@/components/entry-card";
import { EntryDetail } from "@/components/entry-detail";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, X, Plus, Brain } from "lucide-react";
import { NewEntryDialog } from "@/components/new-entry-dialog";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface EntriesViewProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  statusFilter?: string;
  emptyMessage?: string;
  emptyAction?: string;
}

export function EntriesView({ title, description, icon, statusFilter, emptyMessage, emptyAction }: EntriesViewProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { status: statusFilter }],
    queryFn: () => apiRequest("GET", `/api/entries?${queryParams}`).then(r => r.json()),
  });

  // Client-side filtering
  const filtered = entries.filter(e => {
    const matchSearch = !search || 
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.rawInput || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.problem || "").toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "all" || e.priority === priorityFilter;
    const matchEmotion = emotionFilter === "all" || e.emotionalTone === emotionFilter;
    return matchSearch && matchPriority && matchEmotion;
  });

  const hasFilters = search || priorityFilter !== "all" || emotionFilter !== "all";

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-primary">{icon}</div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">{title}</h1>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && (
              <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowNewEntry(true)} className="gap-1.5" data-testid="button-new-entry-view">
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              data-testid="input-search"
            />
          </div>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-priority-filter">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={emotionFilter} onValueChange={setEmotionFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Emotion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All emotions</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="anxious">Anxious</SelectItem>
              <SelectItem value="confident">Confident</SelectItem>
              <SelectItem value="confused">Confused</SelectItem>
              <SelectItem value="energized">Energized</SelectItem>
              <SelectItem value="stressed">Stressed</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1"
              onClick={() => { setSearch(""); setPriorityFilter("all"); setEmotionFilter("all"); }}
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Entries grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Brain className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-base mb-1">
              {hasFilters ? "No matching entries" : emptyMessage || "Nothing here yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              {hasFilters
                ? "Try adjusting your filters or search terms."
                : emptyAction || "Start by creating a new entry to capture your thoughts."}
            </p>
            {!hasFilters && (
              <Button size="sm" onClick={() => setShowNewEntry(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Create first entry
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          open={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      <NewEntryDialog open={showNewEntry} onOpenChange={setShowNewEntry} />
    </div>
  );
}
