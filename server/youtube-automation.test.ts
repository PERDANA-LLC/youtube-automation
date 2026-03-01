import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          niches: [{
            name: "Personal Finance Tips",
            category: "finance",
            subNiche: "budgeting",
            cpmMin: 12,
            cpmMax: 25,
            competitionLevel: "medium",
            trendScore: 85,
            profitabilityScore: 90,
            automationScore: 80,
            rationale: "High CPM niche with strong automation potential.",
            keywords: ["budgeting", "saving money", "personal finance"]
          }]
        })
      }
    }]
  })
}));

// Mock image generation
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/thumbnail.png" })
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true)
}));

// Mock DB functions
vi.mock("./db", () => ({
  getNichesByUser: vi.fn().mockResolvedValue([
    { id: 1, name: "Finance Tips", category: "finance", cpmMin: 12, cpmMax: 25, competitionLevel: "medium", trendScore: 85, profitabilityScore: 90, automationScore: 80, isSelected: false, keywords: ["finance"] }
  ]),
  createNiche: vi.fn().mockResolvedValue(1),
  selectNiche: vi.fn().mockResolvedValue(undefined),
  deleteNiche: vi.fn().mockResolvedValue(undefined),
  getContentIdeasByUser: vi.fn().mockResolvedValue([
    { id: 1, title: "Test Idea", description: "A test idea", source: "trending", viralScore: 85, keywords: ["test"], isUsed: false }
  ]),
  createContentIdea: vi.fn().mockResolvedValue(1),
  deleteContentIdea: vi.fn().mockResolvedValue(undefined),
  markIdeaUsed: vi.fn().mockResolvedValue(undefined),
  getVideosByUser: vi.fn().mockResolvedValue([
    { id: 1, title: "Test Video", status: "idea", videoType: "short", scriptContent: null, thumbnailUrl: null, updatedAt: new Date() }
  ]),
  getVideoStats: vi.fn().mockResolvedValue({ total: 5, byStatus: { idea: 2, scripting: 1, published: 2 } }),
  getVideoById: vi.fn().mockResolvedValue({ id: 1, title: "Test Video", status: "idea" }),
  createVideo: vi.fn().mockResolvedValue(1),
  updateVideo: vi.fn().mockResolvedValue(undefined),
  deleteVideo: vi.fn().mockResolvedValue(undefined),
  getAnalyticsSummary: vi.fn().mockResolvedValue({ totalViews: "10000", totalLikes: "500", totalComments: "100", totalSubscribers: "1000", avgRetention: "45.5", avgCpm: "8.50", totalRevenue: "250.00" }),
  getAnalyticsByUser: vi.fn().mockResolvedValue([
    { id: 1, date: new Date(), views: 1000, likes: 50, comments: 10, cpm: 8.5, estimatedRevenue: 25, subscribers: 100 }
  ]),
  createAnalytics: vi.fn().mockResolvedValue(1),
  getRevenueByUser: vi.fn().mockResolvedValue([
    { id: 1, source: "adsense", amount: 150, description: "Monthly AdSense", date: new Date() }
  ]),
  getRevenueSummary: vi.fn().mockResolvedValue({ totalRevenue: "500", adsenseRevenue: "300", affiliateRevenue: "100", sponsorshipRevenue: "100" }),
  createRevenue: vi.fn().mockResolvedValue(1),
  getCalendarEventsByUser: vi.fn().mockResolvedValue([
    { id: 1, title: "Upload Video", eventType: "upload", scheduledAt: new Date(), isCompleted: false }
  ]),
  createCalendarEvent: vi.fn().mockResolvedValue(1),
  updateCalendarEvent: vi.fn().mockResolvedValue(undefined),
  deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
  getAuditLogsByUser: vi.fn().mockResolvedValue([
    { id: 1, action: "video_created", details: "Created video", createdAt: new Date() }
  ]),
  createAuditLog: vi.fn().mockResolvedValue(1),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("YouTube Automation Studio - Backend Tests", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    caller = appRouter.createCaller(createAuthContext());
  });

  // ---- AUTH ----
  describe("auth", () => {
    it("returns current user from auth.me", async () => {
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.email).toBe("test@example.com");
    });

    it("logs out successfully", async () => {
      const result = await caller.auth.logout();
      expect(result).toEqual({ success: true });
    });
  });

  // ---- NICHE FINDER ----
  describe("niche", () => {
    it("lists niches for the user", async () => {
      const result = await caller.niche.list();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Finance Tips");
    });

    it("discovers niches using AI", async () => {
      const result = await caller.niche.discover({ category: "finance" });
      expect(result.count).toBeGreaterThan(0);
      expect(result.ids).toHaveLength(result.count);
    });

    it("selects a niche", async () => {
      const result = await caller.niche.select({ id: 1 });
      expect(result).toEqual({ success: true });
    });

    it("deletes a niche", async () => {
      const result = await caller.niche.delete({ id: 1 });
      expect(result).toEqual({ success: true });
    });
  });

  // ---- CONTENT RESEARCH ----
  describe("research", () => {
    it("lists content ideas", async () => {
      const result = await caller.research.list();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Idea");
    });

    it("deletes a content idea", async () => {
      const result = await caller.research.delete({ id: 1 });
      expect(result).toEqual({ success: true });
    });

    it("marks an idea as used", async () => {
      const result = await caller.research.markUsed({ id: 1 });
      expect(result).toEqual({ success: true });
    });
  });

  // ---- VIDEO PIPELINE ----
  describe("video", () => {
    it("lists videos", async () => {
      const result = await caller.video.list();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Video");
    });

    it("gets video stats", async () => {
      const result = await caller.video.stats();
      expect(result.total).toBe(5);
      expect(result.byStatus).toBeDefined();
    });

    it("creates a video project", async () => {
      const result = await caller.video.create({ title: "New Video", videoType: "short" });
      expect(result.id).toBe(1);
    });

    it("updates a video status", async () => {
      const result = await caller.video.update({ id: 1, status: "scripting" });
      expect(result).toEqual({ success: true });
    });

    it("deletes a video", async () => {
      const result = await caller.video.delete({ id: 1 });
      expect(result).toEqual({ success: true });
    });

    it("generates a script for a video", async () => {
      // Re-mock LLM for script generation
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as any).mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              script: "This is a test script...",
              wordCount: 150,
              hookLine: "Did you know...",
              ctaLine: "Subscribe now!",
              seoKeywords: ["test", "script"]
            })
          }
        }]
      });

      const result = await caller.video.generateScript({
        videoId: 1,
        topic: "Test topic",
        videoType: "short",
        tone: "engaging",
        includeHook: true,
        includeCTA: true,
      });

      expect(result.script).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.hookLine).toBeDefined();
    });

    it("optimizes SEO for a video", async () => {
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as any).mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              seoTitle: "Optimized Title",
              seoDescription: "Optimized description...",
              tags: ["tag1", "tag2"],
              seoScore: 85,
              suggestions: ["Add more keywords"]
            })
          }
        }]
      });

      const result = await caller.video.optimizeSEO({
        videoId: 1,
        title: "Test Video",
        niche: "finance",
      });

      expect(result.seoScore).toBe(85);
      expect(result.tags).toHaveLength(2);
    });

    it("generates a thumbnail", async () => {
      const result = await caller.video.generateThumbnail({
        videoId: 1,
        prompt: "Finance chart with red arrows",
      });

      expect(result.url).toBe("https://example.com/thumbnail.png");
    });
  });

  // ---- ANALYTICS ----
  describe("analytics", () => {
    it("returns analytics summary", async () => {
      const result = await caller.analytics.summary();
      expect(result.totalViews).toBe("10000");
      expect(result.avgCpm).toBe("8.50");
    });

    it("lists analytics entries", async () => {
      const result = await caller.analytics.list();
      expect(result).toHaveLength(1);
      expect(result[0].views).toBe(1000);
    });

    it("adds analytics data", async () => {
      const result = await caller.analytics.add({
        date: new Date(),
        views: 5000,
        likes: 200,
        cpm: 10,
        estimatedRevenue: 50,
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ---- REVENUE ----
  describe("revenue", () => {
    it("returns revenue summary", async () => {
      const result = await caller.revenue.summary();
      expect(result.totalRevenue).toBe("500");
    });

    it("lists revenue entries", async () => {
      const result = await caller.revenue.list();
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("adsense");
    });

    it("adds revenue entry", async () => {
      const result = await caller.revenue.add({
        source: "adsense",
        amount: 100,
        date: new Date(),
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ---- CALENDAR ----
  describe("calendar", () => {
    it("lists calendar events", async () => {
      const result = await caller.calendar.list();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Upload Video");
    });

    it("creates a calendar event", async () => {
      const result = await caller.calendar.create({
        title: "New Upload",
        eventType: "upload",
        scheduledAt: new Date("2026-03-15"),
      });
      expect(result.id).toBe(1);
    });

    it("updates a calendar event", async () => {
      const result = await caller.calendar.update({
        id: 1,
        isCompleted: true,
      });
      expect(result).toEqual({ success: true });
    });

    it("deletes a calendar event", async () => {
      const result = await caller.calendar.delete({ id: 1 });
      expect(result).toEqual({ success: true });
    });
  });

  // ---- AUDIT LOG ----
  describe("audit", () => {
    it("lists audit logs", async () => {
      const result = await caller.audit.list({ limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe("video_created");
    });
  });

  // ---- NOTIFICATIONS ----
  describe("notify", () => {
    it("sends a notification", async () => {
      const result = await caller.notify.send({
        title: "Test Notification",
        content: "This is a test",
      });
      expect(result.sent).toBe(true);
    });
  });
});
