import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, sql, like, or, lte } from "drizzle-orm";
import {
  users, entries, messages, insights,
  type User, type InsertUser,
  type Entry, type InsertEntry,
  type Message, type InsertMessage,
  type Insight, type InsertInsight,
} from "@shared/schema";

const sqlite = new Database("thinklog.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    raw_thoughts TEXT,
    emotional_state TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'inbox',
    category TEXT,
    tags TEXT,
    context TEXT,
    problem TEXT,
    root_causes TEXT,
    desired_outcome TEXT,
    options TEXT,
    evaluation TEXT,
    action_plan TEXT,
    deadline TEXT,
    prediction TEXT,
    prediction_confidence INTEGER,
    actual_outcome TEXT,
    outcome_rating INTEGER,
    is_structured INTEGER DEFAULT 0,
    structured_at TEXT,
    completed_at TEXT,
    last_reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    entry_id INTEGER REFERENCES entries(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    period TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export interface IStorage {
  // Users
  createUser(data: InsertUser): User;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;

  // Entries
  createEntry(data: InsertEntry): Entry;
  getEntry(id: number, userId: number): Entry | undefined;
  getEntries(userId: number, filters?: { status?: string; category?: string; search?: string }): Entry[];
  updateEntry(id: number, userId: number, data: Partial<Entry>): Entry | undefined;
  deleteEntry(id: number, userId: number): boolean;
  getStaleEntries(userId: number, days?: number): Entry[];
  getEntryStats(userId: number): {
    total: number;
    inbox: number;
    active: number;
    completed: number;
    stale: number;
    avgVelocity: number | null;
    predictionAccuracy: number | null;
    emotionalPatterns: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  };

  // Messages
  createMessage(data: InsertMessage): Message;
  getMessages(userId: number, limit?: number, before?: number): Message[];
  getMessagesByEntry(entryId: number, userId: number): Message[];

  // Insights
  createInsight(data: InsertInsight): Insight;
  getInsight(userId: number, type: string, period: string): Insight | undefined;
  getInsights(userId: number, type?: string): Insight[];
}

export class DatabaseStorage implements IStorage {
  // ─── Users ─────────────────────────────────
  createUser(data: InsertUser): User {
    return db.insert(users).values(data).returning().get();
  }

  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  // ─── Entries ───────────────────────────────
  createEntry(data: InsertEntry): Entry {
    return db.insert(entries).values(data).returning().get();
  }

  getEntry(id: number, userId: number): Entry | undefined {
    return db.select().from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .get();
  }

  getEntries(userId: number, filters?: { status?: string; category?: string; search?: string }): Entry[] {
    let query = db.select().from(entries).where(eq(entries.userId, userId));

    const conditions = [eq(entries.userId, userId)];

    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(entries.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(entries.category, filters.category));
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(entries.title, term),
          like(entries.rawThoughts, term),
          like(entries.problem, term),
          like(entries.context, term)
        )!
      );
    }

    return db.select().from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.updatedAt))
      .all();
  }

  updateEntry(id: number, userId: number, data: Partial<Entry>): Entry | undefined {
    const existing = this.getEntry(id, userId);
    if (!existing) return undefined;

    return db.update(entries)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning()
      .get();
  }

  deleteEntry(id: number, userId: number): boolean {
    const result = db.delete(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .run();
    return result.changes > 0;
  }

  getStaleEntries(userId: number, days: number = 7): Entry[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    return db.select().from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          or(eq(entries.status, "inbox"), eq(entries.status, "active"), eq(entries.status, "action_plan"))!,
          lte(entries.updatedAt, cutoffStr)
        )
      )
      .orderBy(entries.updatedAt)
      .all();
  }

  getEntryStats(userId: number) {
    const allEntries = db.select().from(entries).where(eq(entries.userId, userId)).all();

    const total = allEntries.length;
    const inbox = allEntries.filter(e => e.status === "inbox").length;
    const active = allEntries.filter(e => e.status === "active" || e.status === "action_plan").length;
    const completed = allEntries.filter(e => e.status === "completed").length;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString();
    const stale = allEntries.filter(e =>
      ["inbox", "active", "action_plan"].includes(e.status) &&
      e.updatedAt && e.updatedAt < cutoffStr
    ).length;

    // Decision velocity: avg days from creation to completion
    const completedEntries = allEntries.filter(e => e.completedAt && e.createdAt);
    let avgVelocity: number | null = null;
    if (completedEntries.length > 0) {
      const totalDays = completedEntries.reduce((sum, e) => {
        const created = new Date(e.createdAt!).getTime();
        const done = new Date(e.completedAt!).getTime();
        return sum + (done - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgVelocity = Math.round((totalDays / completedEntries.length) * 10) / 10;
    }

    // Prediction accuracy: entries with both prediction confidence and outcome rating
    const withPredictions = completedEntries.filter(e => e.predictionConfidence && e.outcomeRating);
    let predictionAccuracy: number | null = null;
    if (withPredictions.length > 0) {
      const accurateCount = withPredictions.filter(e =>
        Math.abs((e.predictionConfidence || 5) - (e.outcomeRating || 5)) <= 2
      ).length;
      predictionAccuracy = Math.round((accurateCount / withPredictions.length) * 100);
    }

    // Emotional patterns
    const emotionalPatterns: Record<string, number> = {};
    allEntries.forEach(e => {
      if (e.emotionalState) {
        emotionalPatterns[e.emotionalState] = (emotionalPatterns[e.emotionalState] || 0) + 1;
      }
    });

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    allEntries.forEach(e => {
      if (e.category) {
        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + 1;
      }
    });

    return { total, inbox, active, completed, stale, avgVelocity, predictionAccuracy, emotionalPatterns, categoryBreakdown };
  }

  // ─── Messages ──────────────────────────────
  createMessage(data: InsertMessage): Message {
    return db.insert(messages).values(data).returning().get();
  }

  getMessages(userId: number, limit: number = 50, before?: number): Message[] {
    if (before) {
      return db.select().from(messages)
        .where(and(eq(messages.userId, userId), lte(messages.id, before)))
        .orderBy(desc(messages.id))
        .limit(limit)
        .all()
        .reverse();
    }
    return db.select().from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.id))
      .limit(limit)
      .all()
      .reverse();
  }

  getMessagesByEntry(entryId: number, userId: number): Message[] {
    return db.select().from(messages)
      .where(and(eq(messages.entryId, entryId), eq(messages.userId, userId)))
      .orderBy(messages.id)
      .all();
  }

  // ─── Insights ──────────────────────────────
  createInsight(data: InsertInsight): Insight {
    return db.insert(insights).values(data).returning().get();
  }

  getInsight(userId: number, type: string, period: string): Insight | undefined {
    return db.select().from(insights)
      .where(and(eq(insights.userId, userId), eq(insights.type, type), eq(insights.period, period)))
      .get();
  }

  getInsights(userId: number, type?: string): Insight[] {
    if (type) {
      return db.select().from(insights)
        .where(and(eq(insights.userId, userId), eq(insights.type, type)))
        .orderBy(desc(insights.createdAt))
        .all();
    }
    return db.select().from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.createdAt))
      .all();
  }
}

export const storage = new DatabaseStorage();
