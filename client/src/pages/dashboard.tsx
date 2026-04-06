import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Inbox, Flame, CheckCircle2, LayoutList, TrendingUp, Brain } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";

interface Stats {
  total: number;
  inbox: number;
  active: number;
  completed: number;
  structured: number;
  highPriority: number;
  byCategory: Record<string, number>;
  byEmotion: Record<string, number>;
  recentEntries: any[];
}

const emotionEmoji: Record<string, string> = {
  neutral: "😐",
  anxious: "😰",
  confident: "💪",
  confused: "🤔",
  energized: "⚡",
  stressed: "😤",
};

const emotionLabel: Record<string, string> = {
  neutral: "Neutral",
  anxious: "Anxious",
  confident: "Confident",
  confused: "Confused",
  energized: "Energized",
  stressed: "Stressed",
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  const completionRate = stats && stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const structuredRate = stats && stats.total > 0
    ? Math.round((stats.structured / stats.total) * 100)
    : 0;

  const topCategories = stats
    ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  const topEmotions = stats
    ? Object.entries(stats.byEmotion).sort((a, b) => b[1] - a[1]).slice(0, 6)
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Welcome back, {user?.username}. Here's an overview of your thinking patterns.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Entries", value: stats?.total || 0, icon: Brain, color: "text-primary" },
                { label: "Inbox", value: stats?.inbox || 0, icon: Inbox, color: "text-blue-500" },
                { label: "Active", value: stats?.active || 0, icon: Flame, color: "text-amber-500" },
                { label: "Completed", value: stats?.completed || 0, icon: CheckCircle2, color: "text-green-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-4 px-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-muted-foreground font-medium">{label}</p>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className="font-display font-bold text-2xl">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completion Rate</p>
                    <span className="font-display font-bold text-sm">{completionRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-700"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{stats?.completed} of {stats?.total} resolved</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Structured Rate</p>
                    <span className="font-display font-bold text-sm">{structuredRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${structuredRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{stats?.structured} fully analyzed entries</p>
                </CardContent>
              </Card>
            </div>

            {/* Patterns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Categories */}
              {topCategories.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Top Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {topCategories.map(([cat, count]) => {
                      const max = topCategories[0][1];
                      return (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24 truncate">{cat}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-4 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Emotional patterns */}
              {topEmotions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Emotional Patterns</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {topEmotions.map(([emotion, count]) => (
                        <div key={emotion} className="flex items-center gap-2 text-xs">
                          <span className="text-base">{emotionEmoji[emotion] || "•"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{emotionLabel[emotion] || emotion}</p>
                            <p className="text-muted-foreground">{count} entries</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* High priority alert */}
            {stats && stats.highPriority > 0 && (
              <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-medium">
                      {stats.highPriority} high-priority {stats.highPriority === 1 ? "entry needs" : "entries need"} your attention
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No data state */}
            {stats && stats.total === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-base mb-2">Patterns emerge over time</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Create entries to start seeing your thinking patterns, decision trends, and emotional states here.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
