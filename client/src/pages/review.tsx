import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Target, CheckCircle2 } from "lucide-react";

interface Entry {
  id: number;
  title: string;
  status: string;
  prediction: string | null;
  predictionConfidence: number | null;
  actualOutcome: string | null;
  outcomeRating: number | null;
  completedAt: string | null;
  updatedAt: string;
}

function getAccuracyLabel(confidence: number | null, rating: number | null) {
  if (confidence == null || rating == null) return null;
  const diff = Math.abs(confidence - rating);
  if (diff <= 2) return { label: "Accurate", cls: "bg-green-500/20 text-green-400 border-green-500/30" };
  if (diff <= 4) return { label: "Close", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
  return { label: "Off", cls: "bg-red-500/20 text-red-400 border-red-500/30" };
}

function AccuracyBadge({ confidence, rating }: { confidence: number | null; rating: number | null }) {
  const acc = getAccuracyLabel(confidence, rating);
  if (!acc) return null;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${acc.cls}`}>
      {acc.label}
    </span>
  );
}

function ReviewCard({ entry }: { entry: Entry }) {
  const hasPrediction = entry.prediction != null;
  const hasOutcome = entry.actualOutcome != null;

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 space-y-3"
      data-testid={`review-card-${entry.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{entry.title}</p>
          {entry.completedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed{" "}
              {formatDistanceToNow(new Date(entry.completedAt), { addSuffix: true })}
            </p>
          )}
        </div>
        {hasPrediction && hasOutcome && (
          <AccuracyBadge
            confidence={entry.predictionConfidence}
            rating={entry.outcomeRating}
          />
        )}
      </div>

      {/* Prediction vs Outcome */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Prediction
          </p>
          {hasPrediction ? (
            <>
              <p className="text-xs text-foreground">{entry.prediction}</p>
              {entry.predictionConfidence && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Confidence: {entry.predictionConfidence}/10
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No prediction made</p>
          )}
        </div>

        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Actual outcome
          </p>
          {hasOutcome ? (
            <>
              <p className="text-xs text-foreground">{entry.actualOutcome}</p>
              {entry.outcomeRating && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Rating: {entry.outcomeRating}/10
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No outcome recorded</p>
          )}
        </div>
      </div>

      {!hasPrediction && (
        <p className="text-xs text-muted-foreground">
          No prediction was made for this decision.
        </p>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const { data: entries, isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries", "completed"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/entries?status=completed");
      return res.json();
    },
  });

  // Summary stats
  const withBoth = entries?.filter(
    (e) => e.prediction && e.actualOutcome && e.predictionConfidence && e.outcomeRating
  ) || [];
  const accurateCount = withBoth.filter(
    (e) => Math.abs((e.predictionConfidence || 0) - (e.outcomeRating || 0)) <= 2
  ).length;
  const avgAccuracy =
    withBoth.length > 0 ? Math.round((accurateCount / withBoth.length) * 100) : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 py-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Review</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Prediction vs outcome for completed decisions.
        </p>

        {/* Summary stats */}
        {!isLoading && entries && entries.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Reviewed
              </p>
              <p className="text-xl font-bold text-foreground">{entries.length}</p>
              <p className="text-xs text-muted-foreground">completed decisions</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Avg. Accuracy
              </p>
              <p className="text-xl font-bold text-foreground">
                {avgAccuracy != null ? `${avgAccuracy}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {withBoth.length > 0
                  ? `based on ${withBoth.length} predictions`
                  : "no predictions yet"}
              </p>
            </div>
          </div>
        )}

        {/* Entries list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry) => (
              <ReviewCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Nothing to review yet
            </p>
            <p className="text-xs text-muted-foreground">
              Complete some decisions to see how well you predict outcomes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
