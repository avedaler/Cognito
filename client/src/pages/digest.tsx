import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";

interface Insight {
  id: number;
  type: string;
  content: string;
  period: string;
  createdAt: string;
}

function getWeekLabel(weekStr: string): string {
  // Parse YYYY-WXX
  const [year, week] = weekStr.split("-W");
  const weekNum = parseInt(week);
  const jan1 = new Date(parseInt(year), 0, 1);
  const weekStart = new Date(jan1.getTime() + (weekNum - 1) * 7 * 24 * 3600 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 3600 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}, ${year}`;
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil(diff / (7 * 24 * 3600 * 1000));
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function offsetWeek(weekStr: string, offset: number): string {
  const [year, week] = weekStr.split("-W");
  const y = parseInt(year);
  const w = parseInt(week) + offset;

  if (w <= 0) return `${y - 1}-W52`;
  if (w > 52) return `${y + 1}-W01`;
  return `${y}-W${String(w).padStart(2, "0")}`;
}

function DigestContent({ content }: { content: string }) {
  // Render content with simple formatting
  const lines = content.split("\n").filter(Boolean);
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        if (line.startsWith("##")) {
          return (
            <h3 key={i} className="text-sm font-semibold text-foreground mt-4 first:mt-0">
              {line.replace(/^#+\s*/, "")}
            </h3>
          );
        }
        if (line.startsWith("#")) {
          return (
            <h2 key={i} className="text-base font-bold text-foreground mt-4 first:mt-0">
              {line.replace(/^#+\s*/, "")}
            </h2>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <li key={i} className="text-sm text-foreground ml-3 list-disc">
              {line.replace(/^[-•]\s*/, "")}
            </li>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="text-sm font-semibold text-foreground">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm text-foreground/90 leading-relaxed">
            {line.replace(/\*\*([^*]+)\*\*/g, "$1")}
          </p>
        );
      })}
    </div>
  );
}

export default function DigestPage() {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const qc = useQueryClient();

  const { data: insight, isLoading } = useQuery<Insight | null>({
    queryKey: ["/api/insights/digest", currentWeek],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/insights/digest?week=${currentWeek}`);
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/insights/digest/generate?week=${currentWeek}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/insights/digest", currentWeek] });
    },
  });

  const prevWeek = () => setCurrentWeek((w) => offsetWeek(w, -1));
  const nextWeek = () => {
    const next = offsetWeek(currentWeek, 1);
    if (next <= getCurrentWeek()) setCurrentWeek(next);
  };

  const isCurrentWeek = currentWeek === getCurrentWeek();
  const weekLabel = getWeekLabel(currentWeek);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Weekly Digest</h1>
        <p className="text-sm text-muted-foreground mb-5">
          AI-generated summary of your thinking patterns.
        </p>

        {/* Week selector */}
        <div className="flex items-center justify-between mb-6 bg-card border border-border rounded-xl px-4 py-3">
          <button
            onClick={prevWeek}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
            data-testid="button-prev-week"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{weekLabel}</p>
            {isCurrentWeek && (
              <span className="text-[10px] text-primary font-medium">This week</span>
            )}
          </div>

          <button
            onClick={nextWeek}
            disabled={isCurrentWeek}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="button-next-week"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content area */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/2 mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : insight ? (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Week of {weekLabel}
              </p>
            </div>
            <DigestContent content={insight.content} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <Sparkles className="h-8 w-8 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                No digest for this week
              </p>
              <p className="text-xs text-muted-foreground">
                {isCurrentWeek
                  ? "Generate a digest to see patterns and insights from your conversations."
                  : "No digest was generated for this week."}
              </p>
            </div>
            {isCurrentWeek && (
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate-digest"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {generateMutation.isPending ? "Generating..." : "Generate Digest"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
