import { useState } from "react";
import { Entry } from "@shared/schema";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import {
  Trash2, Save, Brain, Sparkles, Target, AlertTriangle, Lightbulb,
  CheckCircle2, Plus, X, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EntryDetailProps {
  entry: Entry;
  open: boolean;
  onClose: () => void;
}

const statusOptions = ["inbox", "active", "completed", "archived"];
const priorityOptions = ["low", "medium", "high", "urgent"];
const emotionOptions = ["neutral", "anxious", "confident", "confused", "energized", "stressed"];



export function EntryDetail({ entry, open, onClose }: EntryDetailProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // Editable fields
  const [fields, setFields] = useState({
    title: entry.title,
    rawInput: entry.rawInput || "",
    context: entry.context || "",
    problem: entry.problem || "",
    thoughts: entry.thoughts || "",
    rootCauses: entry.rootCauses || "",
    desiredOutcome: entry.desiredOutcome || "",
    evaluation: entry.evaluation || "",
    actionPlan: entry.actionPlan || "",
    status: entry.status,
    priority: entry.priority,
    emotionalTone: entry.emotionalTone || "neutral",
    category: entry.category || "",
    dueDate: entry.dueDate || "",
  });
  const [tags, setTags] = useState<string[]>(() => {
    try { return JSON.parse(entry.tagsJson || "[]"); } catch { return []; }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/entries/${entry.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/spaces"] });
      toast({ title: "Entry updated" });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/entries/${entry.id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/spaces"] });
      toast({ title: "Entry deleted" });
      onClose();
    },
  });

  // Action items
  const { data: actionItems = [] } = useQuery({
    queryKey: ["/api/action-items", entry.id],
    queryFn: () => apiRequest("GET", `/api/action-items?entryId=${entry.id}`, undefined).then(r => r.json()),
  });

  const createActionItem = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/action-items", { entryId: entry.id, text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/action-items", entry.id] }),
  });

  const toggleActionItem = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/action-items/${id}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/action-items", entry.id] }),
  });

  const deleteActionItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/action-items/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/action-items", entry.id] }),
  });

  const [newActionText, setNewActionText] = useState("");

  function handleSave() {
    updateMutation.mutate({ ...fields, tagsJson: JSON.stringify(tags), isStructured: true });
  }

  function handleStatusChange(status: string) {
    updateMutation.mutate({ status });
    setFields(f => ({ ...f, status }));
  }

  async function runAI(mode: string) {
    setAiMode(mode);
    setShowAiPanel(true);
    setAiResponse("");

    try {
      const res = await apiRequest("POST", "/api/ai/analyze", {
        mode,
        entryId: entry.id,
      });
      const data = await res.json();

      if (mode === "structure" && data.structured) {
        // Auto-fill structured fields from server response
        const s = data.structured;
        setFields(f => ({
          ...f,
          context: s.context || f.context,
          problem: s.problem || f.problem,
          thoughts: s.thoughts || f.thoughts,
          rootCauses: s.rootCauses || f.rootCauses,
          desiredOutcome: s.desiredOutcome || f.desiredOutcome,
          evaluation: s.evaluation || f.evaluation,
          actionPlan: s.actionPlan || f.actionPlan,
        }));
        setEditing(true);
        setAiResponse("Fields have been pre-filled with structure. Review and save.");
        // Invalidate entries + spaces since entry was updated server-side
        qc.invalidateQueries({ queryKey: ["/api/entries"] });
        qc.invalidateQueries({ queryKey: ["/api/spaces"] });
      } else {
        setAiResponse(data.response || "No response generated.");
      }
    } catch (err) {
      setAiResponse("AI unavailable. Check that your OpenAI API key is configured.");
    }
    setAiMode(null);
  }

  const aiButtons = [
    { mode: "structure", icon: Sparkles, label: "Structure this", color: "text-primary" },
    { mode: "challenge", icon: Brain, label: "Challenge my thinking", color: "text-amber-600 dark:text-amber-400" },
    { mode: "blind_spots", icon: AlertTriangle, label: "Find blind spots", color: "text-orange-600 dark:text-orange-400" },
    { mode: "action_plan", icon: Target, label: "Turn into action plan", color: "text-green-600 dark:text-green-400" },
  ];

  const structureFields = [
    { key: "context", label: "Context" },
    { key: "problem", label: "Issue / Problem" },
    { key: "thoughts", label: "Thoughts" },
    { key: "rootCauses", label: "Root Causes" },
    { key: "desiredOutcome", label: "Desired Outcome" },
    { key: "evaluation", label: "Evaluation" },
    { key: "actionPlan", label: "Action Plan" },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b px-6 py-4 z-10">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input
                  value={fields.title}
                  onChange={(e) => setFields(f => ({ ...f, title: e.target.value }))}
                  className="font-display font-bold text-base h-auto py-1"
                />
              ) : (
                <h2 className="font-display font-bold text-base leading-tight">{entry.title}</h2>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                {entry.updatedAt !== entry.createdAt && " · updated"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {editing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate()}
                className="text-destructive hover:text-destructive"
                data-testid="button-delete-entry"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Status row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={fields.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>

            {editing ? (
              <>
                <Select value={fields.priority} onValueChange={v => setFields(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{priorityOptions.map(p => <SelectItem key={p} value={p} className="capitalize text-xs">{p}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={fields.emotionalTone} onValueChange={v => setFields(f => ({ ...f, emotionalTone: v }))}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{emotionOptions.map(e => <SelectItem key={e} value={e} className="capitalize text-xs">{e}</SelectItem>)}</SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-xs capitalize">{entry.priority}</Badge>
                {entry.emotionalTone && <Badge variant="secondary" className="text-xs capitalize">{entry.emotionalTone}</Badge>}
              </>
            )}

            {entry.dueDate && (
              <Badge variant="outline" className="text-xs gap-1">
                Due {format(new Date(entry.dueDate), "MMM d")}
              </Badge>
            )}
          </div>

          {/* Raw input */}
          {(entry.rawInput || editing) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raw Thoughts</p>
              {editing ? (
                <Textarea value={fields.rawInput} onChange={(e) => setFields(f => ({ ...f, rawInput: e.target.value }))} className="text-sm min-h-[80px] resize-none" />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.rawInput}</p>
              )}
            </div>
          )}

          <Separator />

          {/* AI Layer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                AI Analysis
              </p>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setShowAiPanel(!showAiPanel)}>
                {showAiPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAiPanel ? "Hide" : "Show"}
              </Button>
            </div>

            {showAiPanel && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-2">
                  {aiButtons.map(({ mode, icon: Icon, label, color }) => (
                    <Button
                      key={mode}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs gap-1.5 h-8"
                      onClick={() => runAI(mode)}
                      disabled={aiMode !== null}
                      data-testid={`button-ai-${mode}`}
                    >
                      {aiMode === mode ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Icon className={cn("w-3 h-3", color)} />
                      )}
                      {label}
                    </Button>
                  ))}
                </div>
                {aiResponse && (
                  <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap bg-background rounded-md p-3 border">
                    {aiResponse}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Structured framework */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decision Framework</p>
            {structureFields.map(({ key, label }) => {
              const value = fields[key];
              if (!editing && !value) return null;
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  {editing ? (
                    <Textarea
                      value={value}
                      onChange={(e) => setFields(f => ({ ...f, [key]: e.target.value }))}
                      className="text-sm min-h-[60px] resize-none"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action items */}
          <Separator />
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Action Items
            </p>

            <div className="space-y-1.5">
              {(actionItems as any[]).map((item: any) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleActionItem.mutate({ id: item.id, completed: !item.completed })}
                    className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      item.completed ? "bg-primary border-primary" : "border-border hover:border-primary"
                    )}
                    data-testid={`button-toggle-action-${item.id}`}
                  >
                    {item.completed && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <span className={cn("text-sm flex-1", item.completed && "line-through text-muted-foreground")}>
                    {item.text}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteActionItem.mutate(item.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add action item..."
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newActionText.trim()) {
                    createActionItem.mutate(newActionText.trim());
                    setNewActionText("");
                  }
                }}
                className="text-sm h-8"
                data-testid="input-new-action"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (newActionText.trim()) {
                    createActionItem.mutate(newActionText.trim());
                    setNewActionText("");
                  }
                }}
                className="h-8"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Tags & Category */}
          {editing && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <Input value={fields.category} onChange={(e) => setFields(f => ({ ...f, category: e.target.value }))} className="text-sm h-8" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                  <Input type="date" value={fields.dueDate} onChange={(e) => setFields(f => ({ ...f, dueDate: e.target.value }))} className="text-sm h-8" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Tags</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const t = tagInput.trim().toLowerCase();
                        if (t && !tags.includes(t)) setTags([...tags, t]);
                        setTagInput("");
                      }
                    }}
                    className="text-sm h-8 flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setTags(tags.filter(t => t !== tag))}>
                      #{tag} <X className="w-2.5 h-2.5" />
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t bg-background/50">
          <p className="text-xs text-muted-foreground text-center">
            <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Created with Perplexity Computer
            </a>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
