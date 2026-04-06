import type { Express } from "express";
import { Server } from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = "cognito-jwt-secret-2024";
const JWT_EXPIRES = "30d";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "cognito_salt_2024").digest("hex");
}

function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  // Support both env var name conventions
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("No OpenAI API key configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

export async function registerRoutes(httpServer: Server, app: Express) {
  const requireAuth = (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = verifyToken(auth.slice(7));
    if (!payload) return res.status(401).json({ message: "Invalid or expired token" });
    const user = storage.getUserById(payload.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.currentUser = user;
    next();
  };

  // ── Auth ────────────────────────────────────────────────────────────
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });
    if (username.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ message: "Username already taken" });

    const user = storage.createUser({ username, password: hashPassword(password) });
    const token = signToken(user.id);
    res.json({ id: user.id, username: user.username, token });
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });

    const user = storage.getUserByUsername(username);
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user.id);
    res.json({ id: user.id, username: user.username, token });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    res.json({ id: req.currentUser.id, username: req.currentUser.username });
  });

  // ── Spaces ───────────────────────────────────────────────────────────
  app.get("/api/spaces", requireAuth, (req: any, res) => {
    const spaceList = storage.getSpaces(req.currentUser.id);
    // Attach entry count to each space
    const allEntries = storage.getEntries(req.currentUser.id);
    const withCounts = spaceList.map(s => ({
      ...s,
      entryCount: allEntries.filter(e => e.spaceId === s.id).length,
    }));
    res.json(withCounts);
  });

  app.post("/api/spaces", requireAuth, (req: any, res) => {
    const { name, description, emoji, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Space name required" });

    const space = storage.createSpace({
      userId: req.currentUser.id,
      name: name.trim(),
      description: description || "",
      emoji: emoji || "📁",
      color: color || "indigo",
    });
    res.status(201).json(space);
  });

  app.patch("/api/spaces/:id", requireAuth, (req: any, res) => {
    const space = storage.updateSpace(Number(req.params.id), req.currentUser.id, req.body);
    if (!space) return res.status(404).json({ message: "Space not found" });
    res.json(space);
  });

  app.delete("/api/spaces/:id", requireAuth, (req: any, res) => {
    // Move entries back to General (null space) before deleting
    const spaceEntries = storage.getEntries(req.currentUser.id, { spaceId: Number(req.params.id) });
    for (const e of spaceEntries) {
      storage.updateEntry(e.id, req.currentUser.id, { spaceId: null });
    }
    const deleted = storage.deleteSpace(Number(req.params.id), req.currentUser.id);
    if (!deleted) return res.status(404).json({ message: "Space not found" });
    res.json({ message: "Space deleted" });
  });

  // ── Entries ──────────────────────────────────────────────────────────
  app.get("/api/entries", requireAuth, (req: any, res) => {
    const { status, search, priority, emotionalTone, category, spaceId } = req.query;
    const filters: any = { status, search, priority, emotionalTone, category };
    // spaceId query: "null" string = general, number = specific space
    if (spaceId !== undefined) {
      filters.spaceId = spaceId === "null" ? null : Number(spaceId);
    }
    const result = storage.getEntries(req.currentUser.id, filters);
    res.json(result);
  });

  app.get("/api/entries/:id", requireAuth, (req: any, res) => {
    const entry = storage.getEntryById(Number(req.params.id), req.currentUser.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  });

  app.post("/api/entries", requireAuth, (req: any, res) => {
    const entry = storage.createEntry({ ...req.body, userId: req.currentUser.id });
    res.status(201).json(entry);
  });

  app.patch("/api/entries/:id", requireAuth, (req: any, res) => {
    const entry = storage.updateEntry(Number(req.params.id), req.currentUser.id, req.body);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  });

  app.delete("/api/entries/:id", requireAuth, (req: any, res) => {
    const deleted = storage.deleteEntry(Number(req.params.id), req.currentUser.id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "Deleted" });
  });

  // ── Action Items ─────────────────────────────────────────────────────
  app.get("/api/action-items", requireAuth, (req: any, res) => {
    const { entryId } = req.query;
    const items = storage.getActionItems(req.currentUser.id, entryId ? Number(entryId) : undefined);
    res.json(items);
  });

  app.post("/api/action-items", requireAuth, (req: any, res) => {
    const item = storage.createActionItem({ ...req.body, userId: req.currentUser.id });
    res.status(201).json(item);
  });

  app.patch("/api/action-items/:id", requireAuth, (req: any, res) => {
    const item = storage.updateActionItem(Number(req.params.id), req.currentUser.id, req.body);
    if (!item) return res.status(404).json({ message: "Action item not found" });
    res.json(item);
  });

  app.delete("/api/action-items/:id", requireAuth, (req: any, res) => {
    const deleted = storage.deleteActionItem(Number(req.params.id), req.currentUser.id);
    if (!deleted) return res.status(404).json({ message: "Action item not found" });
    res.json({ message: "Deleted" });
  });

  // ── Stats ─────────────────────────────────────────────────────────────
  app.get("/api/stats", requireAuth, (req: any, res) => {
    const all = storage.getEntries(req.currentUser.id);
    const spaces = storage.getSpaces(req.currentUser.id);
    res.json({
      total: all.length,
      inbox: all.filter(e => e.status === "inbox").length,
      active: all.filter(e => e.status === "active").length,
      completed: all.filter(e => e.status === "completed").length,
      structured: all.filter(e => e.isStructured).length,
      highPriority: all.filter(e => e.priority === "high" || e.priority === "urgent").length,
      byCategory: all.reduce((acc: Record<string, number>, e) => {
        const cat = e.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {}),
      byEmotion: all.reduce((acc: Record<string, number>, e) => {
        const em = e.emotionalTone || "neutral";
        acc[em] = (acc[em] || 0) + 1;
        return acc;
      }, {}),
      bySpace: spaces.map(s => ({
        id: s.id, name: s.name, emoji: s.emoji,
        count: all.filter(e => e.spaceId === s.id).length,
      })),
      recentEntries: all.slice(0, 5),
    });
  });

  // ── AI Analysis ───────────────────────────────────────────────────────
  app.get("/api/ai/status", requireAuth, (_req, res) => {
    const hasKey = !!(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
    res.json({ available: hasKey });
  });

  app.post("/api/ai/analyze", requireAuth, async (req: any, res) => {
    const { mode, entryId, customPrompt } = req.body;

    let entry: any = null;
    if (entryId) {
      entry = storage.getEntryById(Number(entryId), req.currentUser.id);
      if (!entry) return res.status(404).json({ message: "Entry not found" });
    }

    const prompts: Record<string, string> = {
      structure: `You are a thinking coach. Analyze this raw thought dump and extract a structured decision object.

Raw input: "${entry?.rawInput || entry?.title}"
Title: "${entry?.title}"

Return a JSON object (only JSON, no explanation) with these fields:
{
  "context": "background situation",
  "problem": "core issue or decision",
  "thoughts": "key thoughts and considerations",
  "rootCauses": "underlying causes",
  "desiredOutcome": "what success looks like",
  "evaluation": "analysis of options/tradeoffs",
  "actionPlan": "concrete next steps"
}`,

      challenge: `You are a critical thinking coach. Challenge the thinking in this entry and expose blind spots, assumptions, and logical gaps.

Title: "${entry?.title}"
Context: "${entry?.context || entry?.rawInput}"
Problem: "${entry?.problem}"
Thoughts: "${entry?.thoughts}"

Provide 3-5 pointed, specific challenges to this thinking. Be direct and constructive. Format as numbered points.`,

      action_plan: `You are an execution coach. Turn this entry into a concrete, actionable plan.

Title: "${entry?.title}"
Problem: "${entry?.problem || entry?.rawInput}"
Desired outcome: "${entry?.desiredOutcome}"
Current thoughts: "${entry?.thoughts}"

Create a clear action plan with:
1. Immediate next action (do today)
2. Short-term steps (this week)
3. Medium-term milestones (this month)
4. Success metric (how to know it's done)

Be specific and use action verbs.`,

      blind_spots: `You are a strategic advisor. Identify blind spots, risks, and things this person might be missing or avoiding.

Title: "${entry?.title}"
Context: "${entry?.context || entry?.rawInput}"
Problem: "${entry?.problem}"
Desired outcome: "${entry?.desiredOutcome}"

List 4-6 blind spots or overlooked considerations. Be specific to the situation, not generic.`,

      custom: customPrompt || "Please analyze this entry and provide insights.",
    };

    const prompt = prompts[mode] || prompts.custom;

    try {
      const response = await callOpenAI(prompt);

      if (mode === "structure") {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const structured = JSON.parse(jsonMatch[0]);
            // Auto-update the entry with structured data
            if (entry) {
              storage.updateEntry(entry.id, req.currentUser.id, {
                ...structured,
                isStructured: true,
                status: entry.status === "inbox" ? "active" : entry.status,
              });
            }
            return res.json({ structured, response: "Entry structured successfully.", entryUpdated: true });
          } catch {
            // Fall through
          }
        }
      }

      res.json({ response });
    } catch (err: any) {
      const noKey = !process.env.OPENAI_API_KEY && !process.env.LLM_API_KEY;
      res.status(503).json({
        response: noKey
          ? "AI is not configured. Add your OpenAI API key in the Settings."
          : `AI error: ${err.message}`,
        error: err.message,
        noKey,
      });
    }
  });
}
