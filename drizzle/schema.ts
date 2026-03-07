import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, float } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Niche categories and analysis
export const niches = mysqlTable("niches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  subNiche: varchar("subNiche", { length: 255 }),
  cpmMin: float("cpmMin"),
  cpmMax: float("cpmMax"),
  competitionLevel: mysqlEnum("competitionLevel", ["low", "medium", "high"]),
  trendScore: int("trendScore"),
  profitabilityScore: int("profitabilityScore"),
  automationScore: int("automationScore"),
  rationale: text("rationale"),
  keywords: json("keywords"),
  isSelected: boolean("isSelected").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Niche = typeof niches.$inferSelect;
export type InsertNiche = typeof niches.$inferInsert;

// Video projects (the main pipeline entity)
export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nicheId: int("nicheId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["idea", "researching", "scripting", "voiceover", "thumbnail", "seo", "scheduled", "published"]).default("idea").notNull(),
  videoType: mysqlEnum("videoType", ["short", "long"]).default("short").notNull(),
  scriptContent: text("scriptContent"),
  scriptWordCount: int("scriptWordCount"),
  voiceoverUrl: varchar("voiceoverUrl", { length: 1000 }),
  voiceoverVoice: varchar("voiceoverVoice", { length: 100 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1000 }),
  thumbnailPrompt: text("thumbnailPrompt"),
  seoTitle: varchar("seoTitle", { length: 500 }),
  seoDescription: text("seoDescription"),
  seoTags: json("seoTags"),
  seoScore: int("seoScore"),
  seoSuggestions: json("seoSuggestions"),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  researchData: json("researchData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

// Content research ideas
export const contentIdeas = mysqlTable("contentIdeas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nicheId: int("nicheId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  source: varchar("source", { length: 100 }),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  viralScore: int("viralScore"),
  keywords: json("keywords"),
  isUsed: boolean("isUsed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentIdea = typeof contentIdeas.$inferSelect;
export type InsertContentIdea = typeof contentIdeas.$inferInsert;

// Analytics tracking
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId"),
  date: timestamp("date").notNull(),
  views: int("views").default(0),
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  shares: int("shares").default(0),
  watchTimeMinutes: float("watchTimeMinutes").default(0),
  avgRetentionPercent: float("avgRetentionPercent").default(0),
  cpm: float("cpm").default(0),
  estimatedRevenue: float("estimatedRevenue").default(0),
  subscribers: int("subscribers").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;

// Revenue tracking
export const revenue = mysqlTable("revenue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  source: mysqlEnum("source", ["adsense", "affiliate", "sponsorship", "merchandise", "other"]).notNull(),
  amount: float("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  description: text("description"),
  videoId: int("videoId"),
  date: timestamp("date").notNull(),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Revenue = typeof revenue.$inferSelect;
export type InsertRevenue = typeof revenue.$inferInsert;

// Audit log for pipeline activities
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Calendar events
export const calendarEvents = mysqlTable("calendarEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  eventType: mysqlEnum("eventType", ["upload", "deadline", "review", "milestone"]).default("upload").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  googleCalendarEventId: varchar("googleCalendarEventId", { length: 255 }),
  isCompleted: boolean("isCompleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
