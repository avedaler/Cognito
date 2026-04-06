import { EntriesView } from "@/components/entries-view";
import { CheckCircle2 } from "lucide-react";

export default function CompletedPage() {
  return (
    <EntriesView
      title="Completed"
      description="Resolved decisions and closed loops"
      icon={<CheckCircle2 className="w-5 h-5" />}
      statusFilter="completed"
      emptyMessage="No completed entries yet"
      emptyAction="Mark entries as 'completed' when a decision has been made or a problem resolved."
    />
  );
}
