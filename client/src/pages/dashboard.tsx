import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Clock, TrendingUp, Zap, Brain, AlertCircle } from "lucide-react";

interface EntryStats {
  total: number;
  inbox: number;
  active: number;
  completed: number;
  archived: number;
  stale: number;
  avgCompletionDays?: number;
  predictionAccuracy?: number;
  emotionalBreakdown?: Record<string, number>;
  categoryBreakdown?: Record<string, number>;
}

interface StaleEntry {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
  emotionalState?: string;
}

const EMOTION_EMOJI: Record<string, string> = {
  anxious: "😰",
  frustrated: "😤",
  uncertain: "🤔",
  calm: "😌",
  excited: "🔥",
  confident: "😊",
  overwhelmed: "😵",
};

const STATUS_STYLES: Record<string, string> = {
  inbox: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  action_plan: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const CATEGORY_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number | React.ReactNode;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <>
          <div className="text-xl font-bold text-foreground">{value}</div>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<EntryStats>({
    queryKey: ["/api/entries/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/entries/stats");
      return res.json();
    },
  });

  const { data: staleEntries, isLoading: staleLoading } = useQuery<StaleEntry[]>({
    queryKey: ["/api/entries/stale"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/entries/stale");
      return res.json();
    },
  });

  const isEmpty = !statsLoading && stats && stats.total === 0;

  // Top 3 emotions
  const topEmotions = stats?.emotionalBreakdown
    ? Object.entries(stats.emotionalBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : [];

  // Category breakdown
  const categories = stats?.categoryBreakdown
    ? Object.entries(stats.categoryBreakdown).sort(([, a], [, b]) => b - a)
    : [];
  const maxCat = categories[0]?.[1] || 1;

  const handleStaleClick = (entry: StaleEntry) => {
    setLocation(`/?entryId=${entry.id}`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">

        {/* Header greeting */}
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
          </h1>
          {isEmpty ? (
            <p className="text-sm text-muted-foreground mt-1">
              Start a conversation to see your thinking patterns here.
            </p>
          ) : (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {statsLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{stats?.active}</span> active
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{stats?.inbox}</span> in inbox
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-amber-400 font-medium">{stats?.stale}</span> stale
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Brain className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-medium text-foreground mb-1">Nothing here yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a conversation on the Chat page — decisions, ideas, and patterns will surface here automatically.
            </p>
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-primary hover:underline"
              data-testid="button-goto-chat"
            >
              Go to Chat →
            </button>
          </div>
        )}

        {/* 2x2 Insight Cards */}
        {!isEmpty && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Insights
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Decision Velocity */}
              <StatCard
                label="Decision Velocity"
                icon={Zap}
                loading={statsLoading}
                value={
                  stats?.avgCompletionDays != null
                    ? `${Math.round(stats.avgCompletionDays)}d`
                    : "—"
                }
                sub="avg. days active → completed"
              />

              {/* Prediction Accuracy */}
              <StatCard
                label="Prediction Accuracy"
                icon={TrendingUp}
                loading={statsLoading}
                value={
                  stats?.predictionAccuracy != null
                    ? `${Math.round(stats.predictionAccuracy)}%`
                    : "—"
                }
                sub={
                  stats?.predictionAccuracy != null
                    ? "of predictions were accurate"
                    : "no completed predictions yet"
                }
              />

              {/* Emotional Patterns */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Emotional Patterns
                  </p>
                  <Brain className="h-4 w-4 text-muted-foreground/50" />
                </div>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                ) : topEmotions.length > 0 ? (
                  <div className="space-y-1.5">
                    {topEmotions.map(([emotion, count]) => (
                      <div key={emotion} className="flex items-center gap-2">
                        <span className="text-base">{EMOTION_EMOJI[emotion] || "❓"}</span>
                        <span className="text-sm text-foreground capitalize">{emotion}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{count}×</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No emotional data yet</p>
                )}
              </div>

              {/* Category Breakdown */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Categories
                  </p>
                  <Clock className="h-4 w-4 text-muted-foreground/50" />
                </div>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : categories.length > 0 ? (
                  <div className="space-y-2">
                    {categories.slice(0, 4).map(([cat, count], i) => (
                      <div key={cat} className="flex items-center gap-2">
                        <div
                          className={`h-1.5 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                          style={{ width: `${Math.round((count / maxCat) * 100) * 0.7 + 15}%` }}
                        />
                        <span className="text-xs text-muted-foreground capitalize truncate">
                          {cat}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No categories yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Needs Attention */}
        {!isEmpty && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Needs Attention
              </h2>
              {staleEntries && staleEntries.length > 0 && (
                <span className="text-xs text-amber-400 font-medium">
                  {staleEntries.length} stale
                </span>
              )}
            </div>

            {staleLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : staleEntries && staleEntries.length > 0 ? (
              <div className="space-y-2">
                {staleEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleStaleClick(entry)}
                    className="w-full text-left bg-card border border-border hover:border-primary/40 rounded-xl px-4 py-3 transition-colors group"
                    data-testid={`stale-entry-${entry.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLES[entry.status] || STATUS_STYLES.inbox}`}
                        >
                          {entry.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.updatedAt), {
                            addSuffix: false,
                          })}{" "}
                          stale
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  All caught up — nothing stale right now.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
