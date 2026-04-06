import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Zap, LayoutList, X, Plus, FolderOpen } from "lucide-react";
import type { Space } from "@shared/schema";

interface NewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSpaceId?: number | null;
}

export function NewEntryDialog({ open, onOpenChange, defaultSpaceId }: NewEntryDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"quick" | "full">("quick");

  // Quick entry state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickRaw, setQuickRaw] = useState("");
  const [quickPriority, setQuickPriority] = useState("medium");
  const [quickEmotion, setQuickEmotion] = useState("neutral");
  const [quickSpaceId, setQuickSpaceId] = useState<string>(
    defaultSpaceId != null ? String(defaultSpaceId) : "none"
  );

  // Full entry state
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [problem, setProblem] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [rootCauses, setRootCauses] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [priority, setPriority] = useState("medium");
  const [emotion, setEmotion] = useState("neutral");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [fullSpaceId, setFullSpaceId] = useState<string>(
    defaultSpaceId != null ? String(defaultSpaceId) : "none"
  );

  const { data: spaceList = [] } = useQuery<(Space & { entryCount: number })[]>({
    queryKey: ["/api/spaces"],
    queryFn: () => apiRequest("GET", "/api/spaces").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/entries", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/spaces"] });
      toast({ title: "Entry created", description: "Your thought has been captured." });
      resetAndClose();
    },
    onError: () => {
      toast({ title: "Failed to create entry", variant: "destructive" });
    },
  });

  function resetAndClose() {
    setQuickTitle(""); setQuickRaw(""); setQuickPriority("medium"); setQuickEmotion("neutral");
    setQuickSpaceId(defaultSpaceId != null ? String(defaultSpaceId) : "none");
    setTitle(""); setContext(""); setProblem(""); setThoughts(""); setRootCauses("");
    setDesiredOutcome(""); setEvaluation(""); setActionPlan(""); setPriority("medium");
    setEmotion("neutral"); setCategory(""); setTagInput(""); setTags([]); setDueDate("");
    setFullSpaceId(defaultSpaceId != null ? String(defaultSpaceId) : "none");
    onOpenChange(false);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function parseSpaceId(val: string): number | null {
    return val === "none" ? null : Number(val);
  }

  function handleQuickSubmit() {
    if (!quickTitle.trim()) return;
    createMutation.mutate({
      title: quickTitle,
      rawInput: quickRaw,
      priority: quickPriority,
      emotionalTone: quickEmotion,
      spaceId: parseSpaceId(quickSpaceId),
      status: "inbox",
      isStructured: false,
    });
  }

  function handleFullSubmit() {
    if (!title.trim()) return;
    createMutation.mutate({
      title, context, problem, thoughts, rootCauses, desiredOutcome,
      evaluation, actionPlan, priority, emotionalTone: emotion,
      category, tagsJson: JSON.stringify(tags),
      dueDate: dueDate || null,
      spaceId: parseSpaceId(fullSpaceId),
      status: "active",
      isStructured: true,
    });
  }

  const emotions = ["neutral", "anxious", "confident", "confused", "energized", "stressed"];
  const priorities = ["low", "medium", "high", "urgent"];

  const SpaceSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
        Space
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="select-space">
          <SelectValue placeholder="General (no space)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">General (no space)</SelectItem>
          {spaceList.map(s => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.emoji} {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">New Entry</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="quick" className="gap-1.5 text-sm" data-testid="tab-quick">
              <Zap className="w-3.5 h-3.5" /> Quick Capture
            </TabsTrigger>
            <TabsTrigger value="full" className="gap-1.5 text-sm" data-testid="tab-full">
              <LayoutList className="w-3.5 h-3.5" /> Structured Entry
            </TabsTrigger>
          </TabsList>

          {/* QUICK TAB */}
          <TabsContent value="quick" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="q-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="q-title"
                placeholder="What's on your mind?"
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                data-testid="input-quick-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="q-raw">Raw Thoughts</Label>
              <Textarea
                id="q-raw"
                placeholder="Dump everything here. No filter, no structure. Just get it out."
                value={quickRaw}
                onChange={e => setQuickRaw(e.target.value)}
                className="min-h-[120px] resize-none"
                data-testid="input-quick-raw"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={quickPriority} onValueChange={setQuickPriority}>
                  <SelectTrigger data-testid="select-quick-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>How are you feeling?</Label>
                <Select value={quickEmotion} onValueChange={setQuickEmotion}>
                  <SelectTrigger data-testid="select-quick-emotion"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {emotions.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SpaceSelect value={quickSpaceId} onChange={setQuickSpaceId} />

            <Button
              onClick={handleQuickSubmit}
              disabled={!quickTitle.trim() || createMutation.isPending}
              className="w-full"
              data-testid="button-submit-quick"
            >
              {createMutation.isPending ? "Saving..." : "Capture to Inbox"}
            </Button>
          </TabsContent>

          {/* FULL TAB */}
          <TabsContent value="full" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="f-title"
                placeholder="Decision or issue title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                data-testid="input-full-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Emotional State</Label>
                <Select value={emotion} onValueChange={setEmotion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {emotions.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SpaceSelect value={fullSpaceId} onChange={setFullSpaceId} />
              <div className="space-y-1.5">
                <Label htmlFor="f-category">Category / Topic</Label>
                <Input id="f-category" placeholder="e.g. Strategy, Finance" value={category} onChange={e => setCategory(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-due">Deadline</Label>
              <Input id="f-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>

            {[
              { id: "f-context", label: "Context", val: context, set: setContext, ph: "Background information. What is the situation?" },
              { id: "f-problem", label: "Issue / Problem", val: problem, set: setProblem, ph: "What exactly is the problem or decision to make?" },
              { id: "f-thoughts", label: "Raw Thoughts", val: thoughts, set: setThoughts, ph: "Your unfiltered thoughts on this." },
              { id: "f-roots", label: "Root Causes", val: rootCauses, set: setRootCauses, ph: "What's really causing this? Go deeper." },
              { id: "f-outcome", label: "Desired Outcome", val: desiredOutcome, set: setDesiredOutcome, ph: "What does success look like?" },
              { id: "f-eval", label: "Evaluation", val: evaluation, set: setEvaluation, ph: "Weigh the options. What do the tradeoffs look like?" },
              { id: "f-plan", label: "Action Plan", val: actionPlan, set: setActionPlan, ph: "Concrete next steps. Be specific." },
            ].map(({ id, label, val, set, ph }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Textarea id={id} placeholder={ph} value={val} onChange={e => set(e.target.value)} className="min-h-[72px] resize-none text-sm" />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag and press Enter"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  className="flex-1"
                />
                <Button type="button" size="icon" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setTags(tags.filter(t => t !== tag))}>
                      {tag} <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleFullSubmit}
              disabled={!title.trim() || createMutation.isPending}
              className="w-full"
              data-testid="button-submit-full"
            >
              {createMutation.isPending ? "Saving..." : "Save Structured Entry"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
