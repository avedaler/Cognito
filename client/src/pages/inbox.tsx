import { EntriesView } from "@/components/entries-view";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <EntriesView
      title="Inbox"
      description="Raw thoughts and quick captures"
      icon={<Inbox className="w-5 h-5" />}
      statusFilter="inbox"
      emptyMessage="Your inbox is clear"
      emptyAction="Use Quick Capture to dump thoughts without structuring them first."
    />
  );
}
