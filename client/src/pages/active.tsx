import { EntriesView } from "@/components/entries-view";
import { Flame } from "lucide-react";

export default function ActivePage() {
  return (
    <EntriesView
      title="Active"
      description="Problems and decisions currently in progress"
      icon={<Flame className="w-5 h-5" />}
      statusFilter="active"
      emptyMessage="Nothing active right now"
      emptyAction="Move entries from Inbox to Active when you're actively working on them."
    />
  );
}
