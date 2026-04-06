import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import {
  users, entries, actionItems, spaces,
  type User, type InsertUser,
  type Entry, type InsertEntry,
  type ActionItem, type InsertActionItem,
  type Space, type InsertSpace,
} from "@shared/schema";

const sqlite = new Database("cognito.db");
export const db = drizzle(sqlite);

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    emoji TEXT DEFAULT '📁',
    color TEXT DEFAULT 'indigo',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    space_id INTEGER DEFAULT NULL,
    title TEXT NOT NULL,
    raw_input TEXT DEFAULT '',
    context TEXT DEFAULT '',
    problem TEXT DEFAULT '',
    thoughts TEXT DEFAULT '',
    root_causes TEXT DEFAULT '',
    desired_outcome TEXT DEFAULT '',
    options_json TEXT DEFAULT '[]',
    evaluation TEXT DEFAULT '',
    action_plan TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'inbox',
    priority TEXT NOT NULL DEFAULT 'medium',
    emotional_tone TEXT DEFAULT 'neutral',
    category TEXT DEFAULT '',
    tags_json TEXT DEFAULT '[]',
    is_structured INTEGER NOT NULL DEFAULT 0,
    due_date TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS action_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate: add space_id column if it doesn't exist (for existing DBs)
try {
  sqlite.exec(`ALTER TABLE entries ADD COLUMN space_id INTEGER DEFAULT NULL`);
} catch {
  // Column already exists — ignore
}

export interface IStorage {
  // Users
  getUserById(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  createUser(user: InsertUser): User;

  // Spaces
  getSpaces(userId: number): Space[];
  getSpaceById(id: number, userId: number): Space | undefined;
  createSpace(space: InsertSpace): Space;
  updateSpace(id: number, userId: number, data: Partial<InsertSpace>): Space | undefined;
  deleteSpace(id: number, userId: number): boolean;

  // Entries
  getEntries(userId: number, filters?: {
    status?: string; search?: string; priority?: string;
    emotionalTone?: string; category?: string; spaceId?: number | null;
  }): Entry[];
  getEntryById(id: number, userId: number): Entry | undefined;
  createEntry(entry: InsertEntry): Entry;
  updateEntry(id: number, userId: number, data: Partial<InsertEntry>): Entry | undefined;
  deleteEntry(id: number, userId: number): boolean;

  // Action Items
  getActionItems(userId: number, entryId?: number): ActionItem[];
  createActionItem(item: InsertActionItem): ActionItem;
  updateActionItem(id: number, userId: number, data: Partial<InsertActionItem>): ActionItem | undefined;
  deleteActionItem(id: number, userId: number): boolean;
}

export class SqliteStorage implements IStorage {
  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  createUser(user: InsertUser): User {
    return db.insert(users).values(user).returning().get();
  }

  // --- Spaces ---
  getSpaces(userId: number): Space[] {
    return db.select().from(spaces).where(eq(spaces.userId, userId)).orderBy(spaces.name).all();
  }

  getSpaceById(id: number, userId: number): Space | undefined {
    return db.select().from(spaces).where(and(eq(spaces.id, id), eq(spaces.userId, userId))).get();
  }

  createSpace(space: InsertSpace): Space {
    return db.insert(spaces).values({ ...space, createdAt: new Date().toISOString() }).returning().get();
  }

  updateSpace(id: number, userId: number, data: Partial<InsertSpace>): Space | undefined {
    return db.update(spaces).set(data).where(and(eq(spaces.id, id), eq(spaces.userId, userId))).returning().get();
  }

  deleteSpace(id: number, userId: number): boolean {
    const result = db.delete(spaces).where(and(eq(spaces.id, id), eq(spaces.userId, userId))).run();
    return result.changes > 0;
  }

  // --- Entries ---
  getEntries(userId: number, filters?: {
    status?: string; search?: string; priority?: string;
    emotionalTone?: string; category?: string; spaceId?: number | null;
  }): Entry[] {
    let results = db.select().from(entries).where(eq(entries.userId, userId)).orderBy(desc(entries.createdAt)).all();

    if (filters) {
      if (filters.status) results = results.filter(e => e.status === filters.status);
      if (filters.priority) results = results.filter(e => e.priority === filters.priority);
      if (filters.emotionalTone) results = results.filter(e => e.emotionalTone === filters.emotionalTone);
      if (filters.category) results = results.filter(e => e.category === filters.category);
      // spaceId filter: null means "no space / General", number means specific space
      if (filters.spaceId !== undefined) {
        results = results.filter(e =>
          filters.spaceId === null ? e.spaceId === null : e.spaceId === filters.spaceId
        );
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(e =>
          e.title.toLowerCase().includes(s) ||
          (e.rawInput || "").toLowerCase().includes(s) ||
          (e.problem || "").toLowerCase().includes(s) ||
          (e.context || "").toLowerCase().includes(s)
        );
      }
    }

    return results;
  }

  getEntryById(id: number, userId: number): Entry | undefined {
    return db.select().from(entries).where(and(eq(entries.id, id), eq(entries.userId, userId))).get();
  }

  createEntry(entry: InsertEntry): Entry {
    const now = new Date().toISOString();
    return db.insert(entries).values({ ...entry, createdAt: now, updatedAt: now }).returning().get();
  }

  updateEntry(id: number, userId: number, data: Partial<InsertEntry>): Entry | undefined {
    const now = new Date().toISOString();
    return db.update(entries).set({ ...data, updatedAt: now })
      .where(and(eq(entries.id, id), eq(entries.userId, userId))).returning().get();
  }

  deleteEntry(id: number, userId: number): boolean {
    const result = db.delete(entries).where(and(eq(entries.id, id), eq(entries.userId, userId))).run();
    return result.changes > 0;
  }

  // --- Action Items ---
  getActionItems(userId: number, entryId?: number): ActionItem[] {
    if (entryId) {
      return db.select().from(actionItems).where(and(eq(actionItems.userId, userId), eq(actionItems.entryId, entryId))).all();
    }
    return db.select().from(actionItems).where(eq(actionItems.userId, userId)).all();
  }

  createActionItem(item: InsertActionItem): ActionItem {
    return db.insert(actionItems).values(item).returning().get();
  }

  updateActionItem(id: number, userId: number, data: Partial<InsertActionItem>): ActionItem | undefined {
    return db.update(actionItems).set(data).where(and(eq(actionItems.id, id), eq(actionItems.userId, userId))).returning().get();
  }

  deleteActionItem(id: number, userId: number): boolean {
    const result = db.delete(actionItems).where(and(eq(actionItems.id, id), eq(actionItems.userId, userId))).run();
    return result.changes > 0;
  }
}

export const storage = new SqliteStorage();
