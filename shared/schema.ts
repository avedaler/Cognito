import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ─── Users ───────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Entries (decision objects) ──────────────────────────
export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  rawThoughts: text("raw_thoughts"),
  emotionalState: text("emotional_state"),
  priority: text("priority").default("medium"),
  status: text("status").notNull().default("inbox"),
  category: text("category"),
  tags: text("tags"),
  // Structured fields (filled by AI from conversation)
  context: text("context"),
  problem: text("problem"),
  rootCauses: text("root_causes"),
  desiredOutcome: text("desired_outcome"),
  options: text("options"),
  evaluation: text("evaluation"),
  actionPlan: text("action_plan"),
  deadline: text("deadline"),
  // Prediction tracking
  prediction: text("prediction"),
  predictionConfidence: integer("prediction_confidence"),
  actualOutcome: text("actual_outcome"),
  outcomeRating: integer("outcome_rating"),
  // Meta
  isStructured: integer("is_structured").default(0),
  structuredAt: text("structured_at"),
  completedAt: text("completed_at"),
  lastReviewedAt: text("last_reviewed_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const insertEntrySchema = createInsertSchema(entries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entries.$inferSelect;

// ─── Messages (conversation history) ────────────────────
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  entryId: integer("entry_id").references(() => entries.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON: extracted fields, actions taken
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ─── Insights (weekly digests, patterns) ─────────────────
export const insights = sqliteTable("insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  period: text("period"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const insertInsightSchema = createInsertSchema(insights).omit({ id: true, createdAt: true });
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;

// ─── API validation schemas ──────────────────────────────
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1),
  entryId: z.number().optional(), // if continuing a conversation about a specific entry
});

export const updateEntrySchema = z.object({
  title: z.string().optional(),
  rawThoughts: z.string().optional(),
  emotionalState: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  context: z.string().optional(),
  problem: z.string().optional(),
  rootCauses: z.string().optional(),
  desiredOutcome: z.string().optional(),
  options: z.string().optional(),
  evaluation: z.string().optional(),
  actionPlan: z.string().optional(),
  deadline: z.string().optional(),
  prediction: z.string().optional(),
  predictionConfidence: z.number().min(1).max(10).optional(),
  actualOutcome: z.string().optional(),
  outcomeRating: z.number().min(1).max(10).optional(),
  isStructured: z.number().optional(),
  structuredAt: z.string().optional(),
  completedAt: z.string().optional(),
  lastReviewedAt: z.string().optional(),
});

export const completeEntrySchema = z.object({
  actualOutcome: z.string().min(1),
  outcomeRating: z.number().min(1).max(10),
});
