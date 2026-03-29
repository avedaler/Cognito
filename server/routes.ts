import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import {
  loginSchema, registerSchema, chatMessageSchema,
  updateEntrySchema, completeEntrySchema,
} from "@shared/schema";
import type { User } from "@shared/schema";
import crypto from "crypto";

// Simple password hashing
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Session user type
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

function requireAuth(req: Request, res: Response): User | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  const user = storage.getUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return null;
  }
  return user;
}

// ─── AI Chat Engine ──────────────────────────────────────
async function processChat(
  userId: number,
  userMessage: string,
  entryId?: number
): Promise<{ response: string; entryId?: number; metadata?: any }> {
  // Get conversation context
  const recentMessages = storage.getMessages(userId, 20);
  const stats = storage.getEntryStats(userId);
  const staleEntries = storage.getStaleEntries(userId);

  // Get current entry context if continuing
  let currentEntry = entryId ? storage.getEntry(entryId, userId) : undefined;

  // Get all active entries for context
  const activeEntries = storage.getEntries(userId, { status: "active" });
  const inboxEntries = storage.getEntries(userId, { status: "inbox" });

  // Build system prompt
  const systemPrompt = buildSystemPrompt(stats, staleEntries, activeEntries, inboxEntries, currentEntry);

  // Build message history for AI
  const aiMessages = recentMessages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  aiMessages.push({ role: "user", content: userMessage });

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const aiResponse = await client.messages.create({
      model: "claude_sonnet_4_6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: aiMessages,
    });

    const responseText = aiResponse.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text)
      .join("");

    // Parse the AI response for structured data extraction
    const { cleanResponse, extractedData } = parseAIResponse(responseText);

    // Create or update entry based on extracted data
    let linkedEntryId = entryId;
    if (extractedData) {
      if (extractedData.action === "create_entry") {
        const newEntry = storage.createEntry({
          userId,
          title: extractedData.title || userMessage.slice(0, 60),
          rawThoughts: userMessage,
          emotionalState: extractedData.emotionalState,
          priority: extractedData.priority || "medium",
          status: "inbox",
          category: extractedData.category,
          problem: extractedData.problem,
          context: extractedData.context,
          desiredOutcome: extractedData.desiredOutcome,
        });
        linkedEntryId = newEntry.id;
      } else if (extractedData.action === "update_entry" && linkedEntryId) {
        const updates: any = {};
        if (extractedData.problem) updates.problem = extractedData.problem;
        if (extractedData.context) updates.context = extractedData.context;
        if (extractedData.desiredOutcome) updates.desiredOutcome = extractedData.desiredOutcome;
        if (extractedData.rootCauses) updates.rootCauses = extractedData.rootCauses;
        if (extractedData.options) updates.options = extractedData.options;
        if (extractedData.evaluation) updates.evaluation = extractedData.evaluation;
        if (extractedData.actionPlan) updates.actionPlan = extractedData.actionPlan;
        if (extractedData.prediction) updates.prediction = extractedData.prediction;
        if (extractedData.predictionConfidence) updates.predictionConfidence = extractedData.predictionConfidence;
        if (extractedData.emotionalState) updates.emotionalState = extractedData.emotionalState;
        if (extractedData.priority) updates.priority = extractedData.priority;
        if (extractedData.category) updates.category = extractedData.category;
        if (extractedData.status) updates.status = extractedData.status;
        if (extractedData.title) updates.title = extractedData.title;

        // Mark as structured if enough fields are filled
        const entry = storage.getEntry(linkedEntryId, userId);
        if (entry) {
          const filledFields = [entry.problem, entry.context, entry.desiredOutcome, updates.problem, updates.context, updates.desiredOutcome].filter(Boolean).length;
          if (filledFields >= 2) {
            updates.isStructured = 1;
            updates.structuredAt = new Date().toISOString();
            if (entry.status === "inbox") updates.status = "active";
          }
        }

        storage.updateEntry(linkedEntryId, userId, updates);
      }
    }

    // Save messages
    storage.createMessage({
      userId,
      entryId: linkedEntryId || null,
      role: "user",
      content: userMessage,
      metadata: null,
    });

    storage.createMessage({
      userId,
      entryId: linkedEntryId || null,
      role: "assistant",
      content: cleanResponse,
      metadata: extractedData ? JSON.stringify(extractedData) : null,
    });

    return {
      response: cleanResponse,
      entryId: linkedEntryId,
      metadata: extractedData,
    };
  } catch (error: any) {
    console.error("AI error:", error);
    // Fallback: still save the user message and create entry
    const newEntry = storage.createEntry({
      userId,
      title: userMessage.slice(0, 60),
      rawThoughts: userMessage,
      status: "inbox",
      priority: "medium",
    });

    storage.createMessage({ userId, entryId: newEntry.id, role: "user", content: userMessage, metadata: null });

    const fallback = "I've captured your thought. I'm having trouble connecting to my thinking engine right now, but your entry is saved. I'll be back shortly.";
    storage.createMessage({ userId, entryId: newEntry.id, role: "assistant", content: fallback, metadata: null });

    return { response: fallback, entryId: newEntry.id };
  }
}

function buildSystemPrompt(
  stats: any,
  staleEntries: any[],
  activeEntries: any[],
  inboxEntries: any[],
  currentEntry?: any
): string {
  let prompt = `You are ThinkLog's thinking assistant — a structured thinking partner, not a chatbot. Your job is to help the user think clearly about decisions, problems, and ideas through natural conversation.

PERSONALITY:
- Direct, warm, never sycophantic. No "Great question!" or "That's really interesting!"
- Ask ONE question at a time. Never list multiple questions.
- Be concise. 2-4 sentences max per response unless the user needs more.
- Challenge weak reasoning gently: "What evidence do you have for that?"
- Reference previous context when relevant.

YOUR TASK:
When the user shares a thought, you do TWO things:
1. Respond conversationally — acknowledge, ask a follow-up, or challenge
2. Extract structured data by including a JSON block at the END of your response

STRUCTURED DATA EXTRACTION:
After your conversational response, include a JSON block wrapped in <data> tags. This is INVISIBLE to the user — it's parsed by the system.

For a NEW thought/problem:
<data>{"action":"create_entry","title":"short title","emotionalState":"anxious|frustrated|uncertain|calm|excited|confident|overwhelmed","priority":"low|medium|high|urgent","category":"work|finance|health|relationships|projects|personal","problem":"the core decision if clear"}</data>

For UPDATING an existing entry (when the conversation deepens):
<data>{"action":"update_entry","problem":"...","context":"...","desiredOutcome":"...","rootCauses":"...","options":"[array as JSON string]","evaluation":"...","prediction":"...","predictionConfidence":7,"status":"active","actionPlan":"[{text,checked}]"}</data>

Only include fields you can confidently extract. Skip fields you're unsure about.

If the user is just chatting (greeting, small talk, asking about ThinkLog), respond naturally WITHOUT a <data> block.

CONVERSATION MODES — detect and adapt:
- QUICK DUMP: User vents or captures raw thought → acknowledge, save, ask one emotional follow-up
- THINK THROUGH: User wants to work a problem → guide through: What are you deciding? → What do you want? → What are your options? → What do you think will happen?
- REVIEW: User revisits an old decision → show context, ask for updates or outcomes
- STATUS CHECK: User asks what's on their plate → summarize active/stale items

PROGRESSIVE FRAMEWORK (don't rush — one step per message):
1. Capture the raw thought (create entry)
2. Define the decision: "What exactly are you deciding here?"
3. Clarify desired outcome: "What would the ideal result look like?"
4. Explore options: "What options are you considering?"
5. Challenge: "What's the strongest argument against your preferred option?"
6. Predict: "What do you think will happen if you go with this?"
7. Plan: "What's the first concrete step?"

CURRENT USER STATE:
- ${stats.total} total entries, ${stats.inbox} in inbox, ${stats.active} active, ${stats.completed} completed
- ${stats.stale} stale items (not updated in 7+ days)`;

  if (staleEntries.length > 0) {
    prompt += `\n\nSTALE ENTRIES (might want to surface these):`;
    staleEntries.slice(0, 5).forEach(e => {
      prompt += `\n- "${e.title}" (${e.status}, last updated: ${e.updatedAt})`;
    });
  }

  if (activeEntries.length > 0) {
    prompt += `\n\nACTIVE ENTRIES:`;
    activeEntries.slice(0, 5).forEach(e => {
      prompt += `\n- "${e.title}" — ${e.problem || e.rawThoughts?.slice(0, 80) || "no details"}`;
    });
  }

  if (currentEntry) {
    prompt += `\n\nCURRENT ENTRY CONTEXT (user is continuing this conversation):
Title: ${currentEntry.title}
Status: ${currentEntry.status}
Raw thoughts: ${currentEntry.rawThoughts || "none"}
Problem: ${currentEntry.problem || "not defined yet"}
Context: ${currentEntry.context || "not captured yet"}
Desired outcome: ${currentEntry.desiredOutcome || "not defined yet"}
Options: ${currentEntry.options || "none explored"}
Prediction: ${currentEntry.prediction || "none"}
Emotional state: ${currentEntry.emotionalState || "unknown"}
Priority: ${currentEntry.priority || "medium"}`;
  }

  return prompt;
}

function parseAIResponse(raw: string): { cleanResponse: string; extractedData: any } {
  const dataMatch = raw.match(/<data>([\s\S]*?)<\/data>/);
  let extractedData = null;
  let cleanResponse = raw;

  if (dataMatch) {
    try {
      extractedData = JSON.parse(dataMatch[1]);
      cleanResponse = raw.replace(/<data>[\s\S]*?<\/data>/, "").trim();
    } catch {
      // If JSON parse fails, just return clean response
      cleanResponse = raw.replace(/<data>[\s\S]*?<\/data>/, "").trim();
    }
  }

  return { cleanResponse, extractedData };
}

// ─── Weekly Digest Generator ─────────────────────────────
async function generateDigest(userId: number, week: string): Promise<string> {
  const allEntries = storage.getEntries(userId);
  const stats = storage.getEntryStats(userId);

  // Filter entries for this week (approximate)
  const recentEntries = allEntries.slice(0, 20);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude_sonnet_4_6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Generate a weekly thinking digest for this user. Be direct, insightful, and concise. No fluff.

Stats: ${JSON.stringify(stats)}

Recent entries:
${recentEntries.map(e => `- "${e.title}" (${e.status}, emotion: ${e.emotionalState || "unknown"}, category: ${e.category || "uncategorized"})`).join("\n")}

Write a digest covering:
1. Summary: What was on their mind this week (2 sentences)
2. Patterns: Emotional trends, category focus, avoidance patterns
3. Prediction scorecard: How accurate were their predictions (if any completed)
4. One actionable suggestion for next week

Keep it under 200 words. Be a thinking partner, not a cheerleader.`,
      }],
    });

    return response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text)
      .join("");
  } catch {
    return "Unable to generate digest right now. Your entries are still tracked — check back later.";
  }
}

// ─── Route Registration ──────────────────────────────────
export function registerRoutes(server: Server, app: Express) {

  // ─── Auth ────────────────────────────────
  app.post("/api/auth/register", (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const existing = storage.getUserByEmail(result.data.email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const user = storage.createUser({
      email: result.data.email,
      password: hashPassword(result.data.password),
      name: result.data.name || null,
    });

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  app.post("/api/auth/login", (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const user = storage.getUserByEmail(result.data.email);
    if (!user || user.password !== hashPassword(result.data.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  // ─── Chat (the core) ────────────────────
  app.post("/api/chat", async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const result = chatMessageSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    try {
      const chatResult = await processChat(user.id, result.data.message, result.data.entryId);
      res.json(chatResult);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // ─── Messages ────────────────────────────
  app.get("/api/messages", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before ? parseInt(req.query.before as string) : undefined;
    const msgs = storage.getMessages(user.id, limit, before);
    res.json(msgs);
  });

  // ─── Entries ─────────────────────────────
  app.get("/api/entries", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const filters = {
      status: req.query.status as string,
      category: req.query.category as string,
      search: req.query.search as string,
    };
    res.json(storage.getEntries(user.id, filters));
  });

  app.get("/api/entries/stats", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    res.json(storage.getEntryStats(user.id));
  });

  app.get("/api/entries/stale", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    res.json(storage.getStaleEntries(user.id));
  });

  app.get("/api/entries/:id", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const entry = storage.getEntry(parseInt(req.params.id), user.id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  });

  app.patch("/api/entries/:id", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const result = updateEntrySchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const entry = storage.updateEntry(parseInt(req.params.id), user.id, result.data);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  });

  app.delete("/api/entries/:id", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const deleted = storage.deleteEntry(parseInt(req.params.id), user.id);
    if (!deleted) return res.status(404).json({ error: "Entry not found" });
    res.json({ ok: true });
  });

  app.post("/api/entries/:id/complete", (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const result = completeEntrySchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const entry = storage.updateEntry(parseInt(req.params.id), user.id, {
      status: "completed",
      actualOutcome: result.data.actualOutcome,
      outcomeRating: result.data.outcomeRating,
      completedAt: new Date().toISOString(),
    });
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  });

  // ─── Insights / Digest ──────────────────
  app.get("/api/insights/digest", async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const week = req.query.week as string || getCurrentWeek();
    const existing = storage.getInsight(user.id, "weekly_digest", week);
    if (existing) return res.json(existing);

    res.json(null);
  });

  app.post("/api/insights/digest/generate", async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const week = req.query.week as string || getCurrentWeek();

    try {
      const digestContent = await generateDigest(user.id, week);
      const insight = storage.createInsight({
        userId: user.id,
        type: "weekly_digest",
        content: digestContent,
        period: week,
      });
      res.json(insight);
    } catch {
      res.status(500).json({ error: "Failed to generate digest" });
    }
  });
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil(diff / oneWeek);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
