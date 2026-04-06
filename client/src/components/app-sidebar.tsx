import { useState } from "react";
import { useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Link } from "wouter";
import {
  Inbox, LayoutList, Flame, ListChecks, CheckCircle2, BarChart3, Search,
  LogOut, User, Plus, Pencil, Trash2, FolderOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Space } from "@shared/schema";

const NAV_ITEMS = [
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Structured", url: "/structured", icon: LayoutList },
  { title: "Active", url: "/active", icon: Flame },
  { title: "Action Plans", url: "/action-plans", icon: ListChecks },
  { title: "Completed", url: "/completed", icon: CheckCircle2 },
];
const UTIL_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Search", url: "/search", icon: Search },
];

const SPACE_COLORS: Record<string, string> = {
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
};

const COLOR_OPTIONS = [
  { key: "indigo", label: "Indigo" }, { key: "violet", label: "Violet" },
  { key: "blue", label: "Blue" }, { key: "cyan", label: "Cyan" },
  { key: "emerald", label: "Emerald" }, { key: "amber", label: "Amber" },
  { key: "rose", label: "Rose" }, { key: "slate", label: "Slate" },
];

const EMOJI_OPTIONS = ["📁", "🏢", "💼", "🚀", "💡", "🧠", "📊", "🎯", "🌱", "⚡", "🔥", "💎"];

interface SpaceDialogState {
  open: boolean;
  mode: "create" | "edit";
  space?: Space;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [spacesOpen, setSpacesOpen] = useState(true);
  const [dialog, setDialog] = useState<SpaceDialogState>({ open: false, mode: "create" });
  const [spaceName, setSpaceName] = useState("");
  const [spaceDesc, setSpaceDesc] = useState("");
  const [spaceEmoji, setSpaceEmoji] = useState("📁");
  const [spaceColor, setSpaceColor] = useState("indigo");

  const { data: spaceList = [] } = useQuery<(Space & { entryCount: number })[]>({
    queryKey: ["/api/spaces"],
    queryFn: () => apiRequest("GET", "/api/spaces").then(r => r.json()),
  });

  const createSpace = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/spaces", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/spaces"] });
      toast({ title: "Space created" });
      closeDialog();
    },
  });

  const updateSpace = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/spaces/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/spaces"] });
      toast({ title: "Space updated" });
      closeDialog();
    },
  });

  const deleteSpace = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/spaces/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/spaces"] });
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({ title: "Space deleted", description: "Entries moved to General." });
    },
  });

  function openCreate() {
    setSpaceName(""); setSpaceDesc(""); setSpaceEmoji("📁"); setSpaceColor("indigo");
    setDialog({ open: true, mode: "create" });
  }

  function openEdit(space: Space) {
    setSpaceName(space.name); setSpaceDesc(space.description || "");
    setSpaceEmoji(space.emoji || "📁"); setSpaceColor(space.color || "indigo");
    setDialog({ open: true, mode: "edit", space });
  }

  function closeDialog() {
    setDialog(d => ({ ...d, open: false }));
  }

  function handleSave() {
    if (!spaceName.trim()) return;
    const data = { name: spaceName.trim(), description: spaceDesc, emoji: spaceEmoji, color: spaceColor };
    if (dialog.mode === "edit" && dialog.space) {
      updateSpace.mutate({ id: dialog.space.id, ...data });
    } else {
      createSpace.mutate(data);
    }
  }

  const isActive = (url: string) =>
    url === "/inbox" ? (location === "/" || location === "/inbox") : location === url;

  const isSpaceActive = (id: number) => location === `/spaces/${id}`;

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <svg aria-label="Cognito" viewBox="0 0 32 32" fill="none" className="w-7 h-7 shrink-0">
              <circle cx="16" cy="16" r="14" fill="hsl(var(--sidebar-primary))" opacity="0.15" />
              <circle cx="16" cy="16" r="10" stroke="hsl(var(--sidebar-primary))" strokeWidth="1.5" fill="none" />
              <circle cx="16" cy="10" r="2.5" fill="hsl(var(--sidebar-primary))" />
              <path d="M16 14 L16 22" stroke="hsl(var(--sidebar-primary))" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 18 L20 18" stroke="hsl(var(--sidebar-primary))" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-display font-bold text-[15px] text-sidebar-foreground tracking-tight group-data-[collapsible=icon]:hidden">
              Cognito
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Main Nav */}
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Views</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Spaces */}
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:hidden">
              <button
                className="flex items-center gap-1 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
                onClick={() => setSpacesOpen(o => !o)}
              >
                {spacesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Spaces
              </button>
              <button
                onClick={openCreate}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
                data-testid="button-create-space"
                title="New space"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collapsed icon */}
            <SidebarGroupContent className="group-data-[collapsible=icon]:block hidden">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Spaces" onClick={openCreate}>
                    <FolderOpen className="w-4 h-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>

            {spacesOpen && (
              <SidebarGroupContent className="group-data-[collapsible=icon]:hidden">
                <SidebarMenu>
                  {spaceList.length === 0 ? (
                    <SidebarMenuItem>
                      <button
                        onClick={openCreate}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors rounded-md hover:bg-sidebar-accent"
                      >
                        <Plus className="w-3 h-3" />
                        Create your first space
                      </button>
                    </SidebarMenuItem>
                  ) : (
                    spaceList.map(space => (
                      <SidebarMenuItem key={space.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isSpaceActive(space.id)}
                          tooltip={space.name}
                          className="group/space pr-1"
                        >
                          <Link href={`/spaces/${space.id}`} data-testid={`nav-space-${space.id}`}>
                            <span className={cn(
                              "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] shrink-0",
                              SPACE_COLORS[space.color || "indigo"]
                            )}>
                              {space.emoji}
                            </span>
                            <span className="flex-1 truncate">{space.name}</span>
                            <span className="text-[10px] text-sidebar-foreground/40 shrink-0 group-data-[active=true]:text-sidebar-primary-foreground/60">
                              {space.entryCount || 0}
                            </span>
                            <span className="hidden group-hover/space:flex items-center gap-0.5 shrink-0 ml-1">
                              <button
                                onClick={e => { e.preventDefault(); e.stopPropagation(); openEdit(space); }}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-sidebar-accent-foreground/10"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={e => {
                                  e.preventDefault(); e.stopPropagation();
                                  if (confirm(`Delete "${space.name}"? Entries will move to General.`)) {
                                    deleteSpace.mutate(space.id);
                                  }
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 text-destructive"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>

          <SidebarSeparator />

          {/* Tools */}
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {UTIL_ITEMS.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Account" className="group-data-[collapsible=icon]:justify-center">
                <User className="w-4 h-4" />
                <span className="truncate text-xs">{user?.username}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign out" onClick={logout} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Create / Edit Space Dialog */}
      <Dialog open={dialog.open} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {dialog.mode === "create" ? "New Space" : `Edit "${dialog.space?.name}"`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Emoji picker */}
            <div className="space-y-1.5">
              <Label className="text-xs">Icon</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map(em => (
                  <button
                    key={em}
                    onClick={() => setSpaceEmoji(em)}
                    className={cn(
                      "w-8 h-8 rounded-md text-base flex items-center justify-center border transition-colors",
                      spaceEmoji === em ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    )}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="space-name" className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input
                id="space-name"
                placeholder="e.g. Finran, Personal, Health"
                value={spaceName}
                onChange={e => setSpaceName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                autoFocus
                data-testid="input-space-name"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="space-desc" className="text-xs">Description (optional)</Label>
              <Input
                id="space-desc"
                placeholder="What is this space for?"
                value={spaceDesc}
                onChange={e => setSpaceDesc(e.target.value)}
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setSpaceColor(c.key)}
                    title={c.label}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      SPACE_COLORS[c.key],
                      spaceColor === c.key ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-70 hover:opacity-100"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeDialog}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={!spaceName.trim() || createSpace.isPending || updateSpace.isPending}
                data-testid="button-save-space"
              >
                {dialog.mode === "create" ? "Create Space" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
