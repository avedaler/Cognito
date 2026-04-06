import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Plus } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";
import { NewEntryDialog } from "@/components/new-entry-dialog";

export function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [showNewEntry, setShowNewEntry] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowNewEntry(true)}
            data-testid="button-new-entry"
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Entry
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <NewEntryDialog open={showNewEntry} onOpenChange={setShowNewEntry} />
    </>
  );
}
