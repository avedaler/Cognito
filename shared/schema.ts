import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Spaces table — named workspaces (e.g. "Finran", "Personal", "Health")
export const spaces = sqliteTable("spaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  emoji: text("emoji").default("📁"),
  color: text("color").default("indigo"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertSpaceSchema = createInsertSchema(spaces).omit({ id: true, createdAt: true });
export type InsertSpace = z.infer<typeof insertSpaceSchema>;
export type Space = typeof spaces.$inferSelect;

// Entries table
export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  spaceId: integer("space_id").default(null),  // null = General / no space
  title: text("title").notNull(),
  rawInput: text("raw_input").default(""),
  // Structured fields
  context: text("context").default(""),
  problem: text("problem").default(""),
  thoughts: text("thoughts").default(""),
  rootCauses: text("root_causes").default(""),
  desiredOutcome: text("desired_outcome").default(""),
  optionsJson: text("options_json").default("[]"),
  evaluation: text("evaluation").default(""),
  actionPlan: text("action_plan").default(""),
  // Meta
  status: text("status").notNull().default("inbox"),
  priority: text("priority").notNull().default("medium"),
  emotionalTone: text("emotional_tone").default("neutral"),
  category: text("category").default(""),
  tagsJson: text("tags_json").default("[]"),
  isStructured: integer("is_structured", { mode: "boolean" }).notNull().default(false),
  dueDate: text("due_date").default(null),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertEntrySchema = createInsertSchema(entries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entries.$inferSelect;

// Action items table
export const actionItems = sqliteTable("action_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: integer("entry_id").notNull(),
  userId: integer("user_id").notNull(),
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  dueDate: text("due_date").default(null),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({ id: true, createdAt: true });
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type ActionItem = typeof actionItems.$inferSelect;
