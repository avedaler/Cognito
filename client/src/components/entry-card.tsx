import { Entry } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Clock, Layers, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntryCardProps {
  entry: Entry;
  onClick: () => void;
}

const priorityClass: Record<string, string> = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
  urgent: "priority-urgent",
};

const statusClass: Record<string, string> = {
  inbox: "status-inbox",
  active: "status-active",
  completed: "status-completed",
  archived: "status-archived",
};

const emotionEmoji: Record<string, string> = {
  neutral: "😐",
  anxious: "😰",
  confident: "💪",
  confused: "🤔",
  energized: "⚡",
  stressed: "😤",
};

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const tags: string[] = (() => {
    try { return JSON.parse(entry.tagsJson || "[]"); } catch { return []; }
  })();

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true }); }
    catch { return "recently"; }
  })();

  const preview = entry.rawInput || entry.context || entry.problem || "";

  return (
    <Card
      className="cursor-pointer hover-elevate transition-all group"
      onClick={onClick}
      data-testid={`card-entry-${entry.id}`}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-sm leading-tight line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {entry.title}
          </h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {preview && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {preview}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("text-xs font-medium capitalize px-2 py-0", statusClass[entry.status])}>
            {entry.status}
          </Badge>
          <Badge variant="outline" className={cn("text-xs font-medium capitalize px-2 py-0", priorityClass[entry.priority])}>
            {entry.priority}
          </Badge>
          {entry.isStructured && (
            <Badge variant="outline" className="text-xs px-2 py-0 gap-1">
              <Layers className="w-2.5 h-2.5" />
              Structured
            </Badge>
          )}
          {entry.emotionalTone && entry.emotionalTone !== "neutral" && (
            <span className="text-sm" title={entry.emotionalTone}>
              {emotionEmoji[entry.emotionalTone] || ""}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                #{tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">+{tags.length - 3}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
          {entry.category && (
            <>
              <span className="mx-1">·</span>
              <span>{entry.category}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
