import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Entry, Space } from "@shared/schema";
import { EntryCard } from "@/components/entry-card";
import { EntryDetail } from "@/components/entry-detail";
import { NewEntryDialog } from "@/components/new-entry-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, X, FolderOpen, Flame, Inbox, CheckCircle2, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { key: "all", label: "All", icon: FolderOpen },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "active", label: "Active", icon: Flame },
  { key: "completed", label: "Done", icon: CheckCircle2 },
  { key: "structured", label: "Structured", icon: LayoutList },
];

const SPACE_COLORS: Record<string, string> = {
  indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/20",
  blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20",
  cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20",
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/20",
  slate: "from-slate-500/20 to-slate-500/5 border-slate-500/20",
};

const ACCENT_COLORS: Record<string, string> = {
  indigo: "text-indigo-500",
  violet: "text-violet-500",
  blue: "text-blue-500",
  cyan: "text-cyan-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  rose: "text-rose-500",
  slate: "text-slate-500",
};

export default function SpacePage() {
  const [, params] = useRoute("/spaces/:id");
  const spaceId = Number(params?.id);
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);

  // Load space info
  const { data: allSpaces = [] } = useQuery<(Space & { entryCount: number })[]>({
    queryKey: ["/api/spaces"],
    queryFn: () => apiRequest("GET", "/api/spaces").then(r => r.json()),
  });
  const space = allSpaces.find(s => s.id === spaceId);

  // Load entries for this space
  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { spaceId }],
    queryFn: () => apiRequest("GET", `/api/entries?spaceId=${spaceId}`).then(r => r.json()),
    enabled: !!spaceId,
  });

  // Client-side filter
  const filtered = entries.filter(e => {
    const matchTab =
      activeTab === "all" ? true :
      activeTab === "structured" ? e.isStructured :
      e.status === activeTab;
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.rawInput || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.problem || "").toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "all" || e.priority === priorityFilter;
    return matchTab && matchSearch && matchPriority;
  });

  const counts = {
    all: entries.length,
    inbox: entries.filter(e => e.status === "inbox").length,
    active: entries.filter(e => e.status === "active").length,
    completed: entries.filter(e => e.status === "completed").length,
    structured: entries.filter(e => e.isStructured).length,
  };

  const color = space?.color || "indigo";
  const gradientClass = SPACE_COLORS[color] || SPACE_COLORS.indigo;
  const accentClass = ACCENT_COLORS[color] || ACCENT_COLORS.indigo;

  if (!space && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-display font-semibold text-base mb-1">Space not found</h2>
        <p className="text-sm text-muted-foreground">This space may have been deleted.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Space header */}
      <div className={cn("px-6 pt-5 pb-4 border-b bg-gradient-to-b", gradientClass)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center text-xl shadow-sm border border-border/50">
              {space?.emoji || "📁"}
            </div>
            <div>
              <h1 className="font-display font-bold text-xl leading-tight">
                {space?.name || "Loading..."}
              </h1>
              {space?.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{space.description}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewEntry(true)}
            className="gap-1.5 shrink-0"
            data-testid="button-new-entry-space"
          >
            <Plus className="w-3.5 h-3.5" />
            New Entry
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {STATUS_TABS.map(tab => {
            const count = counts[tab.key as keyof typeof counts];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <tab.icon className={cn("w-3 h-3", activeTab === tab.key && accentClass)} />
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0 rounded-full font-medium",
                    activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b bg-background flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search entries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
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
        {(search || priorityFilter !== "all") && (
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => { setSearch(""); setPriorityFilter("all"); }}>
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
        {!isLoading && (
          <Badge variant="secondary" className="text-xs h-8 px-2.5">{filtered.length}</Badge>
        )}
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
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 text-2xl">
              {space?.emoji || "📁"}
            </div>
            <h3 className="font-display font-semibold text-base mb-1">
              {search || priorityFilter !== "all" ? "No matching entries" : `No entries in ${space?.name || "this space"} yet`}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              {search || priorityFilter !== "all"
                ? "Try clearing your filters."
                : "Create your first entry in this space to get started."}
            </p>
            {!search && priorityFilter === "all" && (
              <Button size="sm" onClick={() => setShowNewEntry(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create entry
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(entry => (
              <EntryCard key={entry.id} entry={entry} onClick={() => setSelectedEntry(entry)} />
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

      <NewEntryDialog
        open={showNewEntry}
        onOpenChange={setShowNewEntry}
        defaultSpaceId={spaceId}
      />
    </div>
  );
}
