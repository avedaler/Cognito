import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EntryDetail } from "@/components/entry-detail";
import { ListChecks, CheckCircle2, Circle, ChevronRight, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export default function ActionPlansPage() {
  const qc = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
    queryFn: () => apiRequest("GET", "/api/entries").then(r => r.json()),
  });

  // Entries that have an action plan
  const withPlans = entries.filter(e => e.actionPlan && e.actionPlan.trim().length > 0);

  const { data: allActionItems = [] } = useQuery<any[]>({
    queryKey: ["/api/action-items"],
    queryFn: () => apiRequest("GET", "/api/action-items").then(r => r.json()),
  });

  const toggleItem = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/action-items/${id}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/action-items"] }),
  });

  function getItemsForEntry(entryId: number) {
    return allActionItems.filter((i: any) => i.entryId === entryId);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Action Plans</h1>
          {!isLoading && <Badge variant="secondary" className="text-xs">{withPlans.length}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">Entries with concrete next steps</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : withPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-base mb-1">No action plans yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add action plans to your entries or use the AI "Turn into action plan" button.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {withPlans.map(entry => {
              const items = getItemsForEntry(entry.id);
              const completed = items.filter((i: any) => i.completed).length;
              const total = items.length;
              const progress = total > 0 ? (completed / total) * 100 : 0;

              return (
                <Card key={entry.id} className="overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <button
                          className="font-display font-semibold text-sm text-left hover:text-primary transition-colors"
                          onClick={() => setSelectedEntry(entry)}
                          data-testid={`button-open-entry-${entry.id}`}
                        >
                          {entry.title}
                        </button>
                        {total > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{completed}/{total}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-xs capitalize",
                          entry.status === "completed" ? "status-completed" : "status-active"
                        )}>
                          {entry.status}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedEntry(entry)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Action plan text */}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {entry.actionPlan}
                    </p>

                    {/* Action items checklist */}
                    {items.length > 0 && (
                      <div className="space-y-1.5 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Checklist</p>
                        {items.slice(0, 5).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <button
                              onClick={() => toggleItem.mutate({ id: item.id, completed: !item.completed })}
                              className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                item.completed ? "bg-primary border-primary" : "border-border hover:border-primary"
                              )}
                            >
                              {item.completed && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                            </button>
                            <span className={cn("text-xs", item.completed && "line-through text-muted-foreground")}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                        {items.length > 5 && (
                          <button
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            +{items.length - 5} more...
                          </button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
