import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import { EntryCard } from "@/components/entry-card";
import { EntryDetail } from "@/components/entry-detail";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
    queryFn: () => apiRequest("GET", "/api/entries").then(r => r.json()),
  });

  const hasFilters = search || statusFilter !== "all" || priorityFilter !== "all" || emotionFilter !== "all" || categoryFilter;

  const filtered = entries.filter(e => {
    const tags: string[] = (() => { try { return JSON.parse(e.tagsJson || "[]"); } catch { return []; } })();
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.rawInput || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.problem || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.context || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.actionPlan || "").toLowerCase().includes(search.toLowerCase()) ||
      tags.some(t => t.includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchPriority = priorityFilter === "all" || e.priority === priorityFilter;
    const matchEmotion = emotionFilter === "all" || e.emotionalTone === emotionFilter;
    const matchCategory = !categoryFilter || (e.category || "").toLowerCase().includes(categoryFilter.toLowerCase());
    return matchSearch && matchStatus && matchPriority && matchEmotion && matchCategory;
  });

  // Get unique categories
  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Search</h1>
          {hasFilters && filtered.length > 0 && (
            <Badge variant="secondary" className="text-xs">{filtered.length} results</Badge>
          )}
        </div>

        {/* Main search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search titles, content, tags, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
            autoFocus
            data-testid="input-main-search"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="inbox">Inbox</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
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
              <SelectItem value="neutral">Neutral 😐</SelectItem>
              <SelectItem value="anxious">Anxious 😰</SelectItem>
              <SelectItem value="confident">Confident 💪</SelectItem>
              <SelectItem value="confused">Confused 🤔</SelectItem>
              <SelectItem value="energized">Energized ⚡</SelectItem>
              <SelectItem value="stressed">Stressed 😤</SelectItem>
            </SelectContent>
          </Select>

          {categories.length > 0 && (
            <Select value={categoryFilter || "all"} onValueChange={v => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setEmotionFilter("all");
                setCategoryFilter("");
              }}
            >
              <X className="w-3 h-3" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {!hasFilters ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-base mb-1">Search all entries</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Search across titles, content, tags, and categories. Use filters to narrow by status, priority, or emotion.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No entries match your search.</p>
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

      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          open={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
