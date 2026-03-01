import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  niches, InsertNiche, Niche,
  videos, InsertVideo, Video,
  contentIdeas, InsertContentIdea,
  analytics, InsertAnalytics,
  revenue, InsertRevenue,
  auditLogs, InsertAuditLog,
  calendarEvents, InsertCalendarEvent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---- Niche helpers ----
export async function createNiche(data: InsertNiche) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const result = await db.insert(niches).values(data);
  return result[0].insertId;
}

export async function getNichesByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(niches).where(eq(niches.userId, userId)).orderBy(desc(niches.createdAt));
}

export async function deleteNiche(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(niches).where(and(eq(niches.id, id), eq(niches.userId, userId)));
}

export async function selectNiche(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(niches).set({ isSelected: false }).where(eq(niches.userId, userId));
  await db.update(niches).set({ isSelected: true }).where(and(eq(niches.id, id), eq(niches.userId, userId)));
}

// ---- Video helpers ----
export async function createVideo(data: InsertVideo) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const result = await db.insert(videos).values(data);
  return result[0].insertId;
}

export async function getVideosByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(videos).where(eq(videos.userId, userId)).orderBy(desc(videos.updatedAt));
}

export async function getVideoById(id: number, userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(videos).where(and(eq(videos.id, id), eq(videos.userId, userId))).limit(1);
  return result[0];
}

export async function updateVideo(id: number, userId: number, data: Partial<InsertVideo>) {
  const db = await getDb(); if (!db) return;
  await db.update(videos).set(data).where(and(eq(videos.id, id), eq(videos.userId, userId)));
}

export async function deleteVideo(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(videos).where(and(eq(videos.id, id), eq(videos.userId, userId)));
}

export async function getVideoStats(userId: number) {
  const db = await getDb(); if (!db) return { total: 0, byStatus: {} };
  const all = await db.select().from(videos).where(eq(videos.userId, userId));
  const byStatus: Record<string, number> = {};
  all.forEach(v => { byStatus[v.status] = (byStatus[v.status] || 0) + 1; });
  return { total: all.length, byStatus };
}

// ---- Content Ideas helpers ----
export async function createContentIdea(data: InsertContentIdea) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const result = await db.insert(contentIdeas).values(data);
  return result[0].insertId;
}

export async function getContentIdeasByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(contentIdeas).where(eq(contentIdeas.userId, userId)).orderBy(desc(contentIdeas.createdAt));
}

export async function deleteContentIdea(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(contentIdeas).where(and(eq(contentIdeas.id, id), eq(contentIdeas.userId, userId)));
}

export async function markIdeaUsed(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(contentIdeas).set({ isUsed: true }).where(and(eq(contentIdeas.id, id), eq(contentIdeas.userId, userId)));
}

// ---- Analytics helpers ----
export async function createAnalytics(data: InsertAnalytics) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.insert(analytics).values(data);
}

export async function getAnalyticsByUser(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(analytics.userId, userId)];
  if (startDate) conditions.push(gte(analytics.date, startDate));
  if (endDate) conditions.push(lte(analytics.date, endDate));
  return db.select().from(analytics).where(and(...conditions)).orderBy(desc(analytics.date));
}

export async function getAnalyticsSummary(userId: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select({
    totalViews: sql<number>`COALESCE(SUM(${analytics.views}), 0)`,
    totalLikes: sql<number>`COALESCE(SUM(${analytics.likes}), 0)`,
    totalComments: sql<number>`COALESCE(SUM(${analytics.comments}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${analytics.estimatedRevenue}), 0)`,
    avgCpm: sql<number>`COALESCE(AVG(${analytics.cpm}), 0)`,
    avgRetention: sql<number>`COALESCE(AVG(${analytics.avgRetentionPercent}), 0)`,
    totalSubscribers: sql<number>`COALESCE(MAX(${analytics.subscribers}), 0)`,
  }).from(analytics).where(eq(analytics.userId, userId));
  return result[0];
}

// ---- Revenue helpers ----
export async function createRevenue(data: InsertRevenue) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.insert(revenue).values(data);
}

export async function getRevenueByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(revenue).where(eq(revenue.userId, userId)).orderBy(desc(revenue.date));
}

export async function getRevenueSummary(userId: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(${revenue.amount}), 0)`,
    adsenseRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${revenue.source} = 'adsense' THEN ${revenue.amount} ELSE 0 END), 0)`,
    affiliateRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${revenue.source} = 'affiliate' THEN ${revenue.amount} ELSE 0 END), 0)`,
    sponsorshipRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${revenue.source} = 'sponsorship' THEN ${revenue.amount} ELSE 0 END), 0)`,
  }).from(revenue).where(eq(revenue.userId, userId));
  return result[0];
}

// ---- Audit Log helpers ----
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb(); if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogsByUser(userId: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ---- Calendar Event helpers ----
export async function createCalendarEvent(data: InsertCalendarEvent) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const result = await db.insert(calendarEvents).values(data);
  return result[0].insertId;
}

export async function getCalendarEventsByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(desc(calendarEvents.scheduledAt));
}

export async function updateCalendarEvent(id: number, userId: number, data: Partial<InsertCalendarEvent>) {
  const db = await getDb(); if (!db) return;
  await db.update(calendarEvents).set(data).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}

export async function deleteCalendarEvent(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}
