import { EntriesView } from "@/components/entries-view";
import { LayoutList } from "lucide-react";

export default function StructuredPage() {
  return (
    <EntriesView
      title="Structured Entries"
      description="Fully analyzed decision objects"
      icon={<LayoutList className="w-5 h-5" />}
      emptyMessage="No structured entries yet"
      emptyAction="Use 'Structured Entry' form or the AI 'Structure this' button to convert raw thoughts into frameworks."
    />
  );
}
