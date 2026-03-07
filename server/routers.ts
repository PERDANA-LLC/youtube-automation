import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ---- NICHE FINDER ----
  niche: router({
    list: protectedProcedure.query(({ ctx }) => db.getNichesByUser(ctx.user.id)),

    discover: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        customNiche: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const prompt = input.customNiche
          ? `Analyze this YouTube niche for profitability: "${input.customNiche}". Consider it alongside profitable YouTube automation niches.`
          : `Find the top 5 most profitable YouTube automation niches${input.category ? ` in the "${input.category}" category` : ''} for 2026.`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a YouTube niche analysis expert. Analyze niches for faceless YouTube automation channels. Return JSON array of niches with: name, category (one of: storytelling, finance, tech, health, education, business, self-improvement, legal, travel, gaming), subNiche, cpmMin (number), cpmMax (number), competitionLevel (low/medium/high), trendScore (1-100), profitabilityScore (1-100), automationScore (1-100), rationale (2-3 sentences), keywords (array of strings).`
            },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "niche_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  niches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: { type: "string" },
                        subNiche: { type: "string" },
                        cpmMin: { type: "number" },
                        cpmMax: { type: "number" },
                        competitionLevel: { type: "string" },
                        trendScore: { type: "integer" },
                        profitabilityScore: { type: "integer" },
                        automationScore: { type: "integer" },
                        rationale: { type: "string" },
                        keywords: { type: "array", items: { type: "string" } }
                      },
                      required: ["name", "category", "subNiche", "cpmMin", "cpmMax", "competitionLevel", "trendScore", "profitabilityScore", "automationScore", "rationale", "keywords"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["niches"],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === 'string' ? content : '{"niches":[]}');
        const savedIds: number[] = [];

        for (const n of parsed.niches) {
          const id = await db.createNiche({
            userId: ctx.user.id,
            name: n.name,
            category: n.category,
            subNiche: n.subNiche,
            cpmMin: n.cpmMin,
            cpmMax: n.cpmMax,
            competitionLevel: n.competitionLevel,
            trendScore: n.trendScore,
            profitabilityScore: n.profitabilityScore,
            automationScore: n.automationScore,
            rationale: n.rationale,
            keywords: n.keywords,
          });
          savedIds.push(id);
        }

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "niche_discovery",
          entityType: "niche",
          details: `Discovered ${parsed.niches.length} niches${input.category ? ` in ${input.category}` : ''}`,
        });

        return { count: parsed.niches.length, ids: savedIds };
      }),

    select: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.selectNiche(input.id, ctx.user.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNiche(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ---- CONTENT RESEARCH ----
  research: router({
    list: protectedProcedure.query(({ ctx }) => db.getContentIdeasByUser(ctx.user.id)),

    generate: protectedProcedure
      .input(z.object({
        niche: z.string(),
        count: z.number().min(1).max(20).default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a YouTube content researcher specializing in viral video ideas. Generate unique, engaging video ideas for YouTube Shorts and long-form content. Each idea should have high viral potential. Return JSON with array of ideas containing: title, description (2-3 sentences), source (trending/reddit/news/evergreen), viralScore (1-100), keywords (array).`
            },
            {
              role: "user",
              content: `Generate ${input.count} viral video ideas for the "${input.niche}" niche on YouTube. Mix trending topics, Reddit-worthy stories, news angles, and evergreen content. Focus on ideas that work well for faceless/automated channels.`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "content_ideas",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        source: { type: "string" },
                        viralScore: { type: "integer" },
                        keywords: { type: "array", items: { type: "string" } }
                      },
                      required: ["title", "description", "source", "viralScore", "keywords"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["ideas"],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === 'string' ? content : '{"ideas":[]}');

        for (const idea of parsed.ideas) {
          await db.createContentIdea({
            userId: ctx.user.id,
            title: idea.title,
            description: idea.description,
            source: idea.source,
            viralScore: idea.viralScore,
            keywords: idea.keywords,
          });
        }

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "content_research",
          entityType: "contentIdea",
          details: `Generated ${parsed.ideas.length} content ideas for "${input.niche}"`,
        });

        return { count: parsed.ideas.length };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteContentIdea(input.id, ctx.user.id);
        return { success: true };
      }),

    markUsed: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markIdeaUsed(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ---- VIDEO PIPELINE ----
  video: router({
    list: protectedProcedure.query(({ ctx }) => db.getVideosByUser(ctx.user.id)),
    stats: protectedProcedure.query(({ ctx }) => db.getVideoStats(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => db.getVideoById(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        videoType: z.enum(["short", "long"]).default("short"),
        nicheId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVideo({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          videoType: input.videoType,
          nicheId: input.nicheId,
          status: "idea",
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "video_created",
          entityType: "video",
          entityId: id,
          details: `Created video project: "${input.title}"`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["idea", "researching", "scripting", "voiceover", "thumbnail", "seo", "scheduled", "published"]).optional(),
        scheduledAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateVideo(id, ctx.user.id, data);
        if (data.status) {
          await db.createAuditLog({
            userId: ctx.user.id,
            action: `video_status_${data.status}`,
            entityType: "video",
            entityId: id,
            details: `Video status changed to: ${data.status}`,
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteVideo(input.id, ctx.user.id);
        return { success: true };
      }),

    // AI Script Writer
    generateScript: protectedProcedure
      .input(z.object({
        videoId: z.number(),
        topic: z.string(),
        videoType: z.enum(["short", "long"]).default("short"),
        tone: z.string().default("engaging and conversational"),
        includeHook: z.boolean().default(true),
        includeCTA: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const durationGuide = input.videoType === "short"
          ? "30-60 seconds (100-180 words)"
          : "8-12 minutes (1200-1800 words)";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert YouTube scriptwriter who creates viral, engaging scripts. Write scripts that are optimized for viewer retention with strong hooks, storytelling structure, and clear calls-to-action. Return JSON with: script (the full script text), wordCount (number), hookLine (the opening hook), ctaLine (the closing CTA), seoKeywords (array of keywords found in the script).`
            },
            {
              role: "user",
              content: `Write a YouTube ${input.videoType} script about: "${input.topic}"\n\nTarget duration: ${durationGuide}\nTone: ${input.tone}\n${input.includeHook ? 'Include a powerful hook in the first 3 seconds.' : ''}\n${input.includeCTA ? 'Include a compelling call-to-action at the end.' : ''}\n\nStructure: Hook → Problem/Setup → Story/Content → Resolution → CTA`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "script_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  script: { type: "string" },
                  wordCount: { type: "integer" },
                  hookLine: { type: "string" },
                  ctaLine: { type: "string" },
                  seoKeywords: { type: "array", items: { type: "string" } }
                },
                required: ["script", "wordCount", "hookLine", "ctaLine", "seoKeywords"],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === 'string' ? content : '{}');

        await db.updateVideo(input.videoId, ctx.user.id, {
          scriptContent: parsed.script,
          scriptWordCount: parsed.wordCount,
          status: "scripting",
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "script_generated",
          entityType: "video",
          entityId: input.videoId,
          details: `Generated ${parsed.wordCount}-word script for "${input.topic}"`,
        });

        return parsed;
      }),

    // SEO Optimizer
    optimizeSEO: protectedProcedure
      .input(z.object({
        videoId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        niche: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a YouTube SEO expert. Optimize video metadata for maximum discoverability. Return JSON with: seoTitle (optimized title, max 100 chars), seoDescription (optimized description with keywords, 200-500 words), tags (array of 15-30 relevant tags), seoScore (1-100 based on optimization quality), suggestions (array of improvement tips).`
            },
            {
              role: "user",
              content: `Optimize SEO for this YouTube video:\nTitle: "${input.title}"\n${input.description ? `Description: "${input.description}"` : ''}\n${input.niche ? `Niche: "${input.niche}"` : ''}\n\nMaximize for YouTube search, suggested videos, and Browse features.`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "seo_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  seoTitle: { type: "string" },
                  seoDescription: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  seoScore: { type: "integer" },
                  suggestions: { type: "array", items: { type: "string" } }
                },
                required: ["seoTitle", "seoDescription", "tags", "seoScore", "suggestions"],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === 'string' ? content : '{}');

        await db.updateVideo(input.videoId, ctx.user.id, {
          seoTitle: parsed.seoTitle,
          seoDescription: parsed.seoDescription,
          seoTags: parsed.tags,
          seoScore: parsed.seoScore,
          seoSuggestions: parsed.suggestions,
          status: "seo",
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "seo_optimized",
          entityType: "video",
          entityId: input.videoId,
          details: `SEO optimized with score: ${parsed.seoScore}/100`,
        });

        return parsed;
      }),

    // Save SEO Results (manual save after editing)
    saveSEO: protectedProcedure
      .input(z.object({
        videoId: z.number(),
        seoTitle: z.string(),
        seoDescription: z.string(),
        seoTags: z.array(z.string()),
        seoScore: z.number(),
        seoSuggestions: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateVideo(input.videoId, ctx.user.id, {
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          seoTags: input.seoTags,
          seoScore: input.seoScore,
          seoSuggestions: input.seoSuggestions ?? [],
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "seo_saved",
          entityType: "video",
          entityId: input.videoId,
          details: `Saved SEO results with score: ${input.seoScore}/100`,
        });

        return { success: true };
      }),

    // Thumbnail Generator with retry logic
    generateThumbnail: protectedProcedure
      .input(z.object({
        videoId: z.number(),
        prompt: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const enhancedPrompt = `Create a visually striking YouTube thumbnail: ${input.prompt}. Use vibrant colors, high contrast, and bold composition. Professional quality, landscape orientation.`;

        // Retry with exponential backoff for transient provider errors
        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              // Exponential backoff: 2s, 4s
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
            const result = await generateImage({ prompt: enhancedPrompt });

            await db.updateVideo(input.videoId, ctx.user.id, {
              thumbnailUrl: result.url,
              thumbnailPrompt: input.prompt,
              status: "thumbnail",
            });

            await db.createAuditLog({
              userId: ctx.user.id,
              action: "thumbnail_generated",
              entityType: "video",
              entityId: input.videoId,
              details: `Generated thumbnail for video (attempt ${attempt + 1})`,
            });

            return { url: result.url };
          } catch (err: any) {
            lastError = err;
            console.error(`Thumbnail generation attempt ${attempt + 1} failed:`, err.message);
            // Only retry on 500-level or transient errors
            if (err.message && !err.message.includes('500') && !err.message.includes('GENERATE_ERROR') && !err.message.includes('Internal Server Error')) {
              break; // Don't retry on non-transient errors
            }
          }
        }

        throw new Error(`Thumbnail generation failed after ${MAX_RETRIES} attempts. The AI image service may be temporarily unavailable — please try again in a moment. Last error: ${lastError?.message || 'Unknown error'}`);
      }),

    // Voiceover Generator (TTS) using sherpa-onnx local engine
    generateVoiceover: protectedProcedure
      .input(z.object({
        videoId: z.number(),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("alloy"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { execSync } = await import("child_process");
        const fs = await import("fs");
        const path = await import("path");

        // 1. Fetch the video to get its script
        const video = await db.getVideoById(input.videoId, ctx.user.id);
        if (!video || !video.scriptContent) {
          throw new Error("Video not found or has no script content");
        }

        const scriptText = video.scriptContent;

        // 2. Map voice names to sherpa-onnx length-scale (larger = slower, smaller = faster)
        const voiceLengthScaleMap: Record<string, number> = {
          alloy: 1.0,
          echo: 1.1,    // Slightly slower for warm, deep tone
          fable: 0.95,  // Slightly faster for expressive tone
          onyx: 1.15,   // Slower for deep, authoritative tone
          nova: 0.9,    // Faster for friendly, warm tone
          shimmer: 0.85, // Fastest for clear, bright tone
        };
        const lengthScale = voiceLengthScaleMap[input.voice] ?? 1.0;

        // 3. Generate audio using sherpa-onnx local TTS
        const SHERPA_EXE = "/home/ubuntu/tools/sherpa-onnx-tts/runtime/bin/sherpa-onnx-offline-tts";
        const MODEL_DIR = "/home/ubuntu/tools/sherpa-onnx-tts/models/vits-piper-en_US-lessac-high";
        const tmpDir = "/tmp/tts-output";
        fs.mkdirSync(tmpDir, { recursive: true });

        const { nanoid } = await import("nanoid");
        const outputFile = path.join(tmpDir, `vo-${nanoid(8)}.wav`);

        // Clean the script text for shell safety
        const cleanText = scriptText
          .slice(0, 5000)
          .replace(/["\\`$]/g, '')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Write text to a temp file to avoid shell escaping issues
        const textFile = path.join(tmpDir, `text-${nanoid(8)}.txt`);
        fs.writeFileSync(textFile, cleanText);

        try {
          const cmd = [
            `LD_LIBRARY_PATH=/home/ubuntu/tools/sherpa-onnx-tts/runtime/lib`,
            SHERPA_EXE,
            `--vits-model="${MODEL_DIR}/en_US-lessac-high.onnx"`,
            `--vits-tokens="${MODEL_DIR}/tokens.txt"`,
            `--vits-data-dir="${MODEL_DIR}/espeak-ng-data"`,
            `--vits-length-scale=${lengthScale}`,
            `--output-filename="${outputFile}"`,
            `"$(cat ${textFile})"`,
          ].join(' ');

          execSync(cmd, {
            timeout: 120000, // 2 min timeout
            stdio: 'pipe',
            shell: '/bin/bash',
          });
        } catch (err: any) {
          throw new Error(`TTS generation failed: ${err.message}`);
        } finally {
          // Clean up text file
          try { fs.unlinkSync(textFile); } catch {}
        }

        if (!fs.existsSync(outputFile)) {
          throw new Error("TTS generation produced no output file");
        }

        // 4. Read the WAV file and upload to S3
        const audioBuffer = fs.readFileSync(outputFile);
        const { storagePut } = await import("./storage");
        const fileKey = `voiceovers/${ctx.user.id}/${input.videoId}-${nanoid(8)}.wav`;
        const { url: audioUrl } = await storagePut(fileKey, audioBuffer, "audio/wav");

        // Clean up local file
        try { fs.unlinkSync(outputFile); } catch {}

        // 5. Update the video record
        await db.updateVideo(input.videoId, ctx.user.id, {
          voiceoverUrl: audioUrl,
          voiceoverVoice: input.voice,
          status: "voiceover",
        });

        // 6. Audit log
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "voiceover_generated",
          entityType: "video",
          entityId: input.videoId,
          details: `Generated voiceover with voice "${input.voice}" for "${video.title}"`,
        });

        return {
          url: audioUrl,
          voice: input.voice,
          wordCount: video.scriptWordCount ?? scriptText.split(/\s+/).length,
          charCount: scriptText.length,
        };
      }),
  }),

  // ---- ANALYTICS ----
  analytics: router({
    summary: protectedProcedure.query(({ ctx }) => db.getAnalyticsSummary(ctx.user.id)),
    list: protectedProcedure.query(({ ctx }) => db.getAnalyticsByUser(ctx.user.id)),

    add: protectedProcedure
      .input(z.object({
        videoId: z.number().optional(),
        date: z.date(),
        views: z.number().default(0),
        likes: z.number().default(0),
        comments: z.number().default(0),
        shares: z.number().default(0),
        watchTimeMinutes: z.number().default(0),
        avgRetentionPercent: z.number().default(0),
        cpm: z.number().default(0),
        estimatedRevenue: z.number().default(0),
        subscribers: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createAnalytics({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
  }),

  // ---- REVENUE ----
  revenue: router({
    list: protectedProcedure.query(({ ctx }) => db.getRevenueByUser(ctx.user.id)),
    summary: protectedProcedure.query(({ ctx }) => db.getRevenueSummary(ctx.user.id)),

    add: protectedProcedure
      .input(z.object({
        source: z.enum(["adsense", "affiliate", "sponsorship", "merchandise", "other"]),
        amount: z.number(),
        description: z.string().optional(),
        videoId: z.number().optional(),
        date: z.date(),
        stripePaymentId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createRevenue({ userId: ctx.user.id, ...input });
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "revenue_added",
          entityType: "revenue",
          details: `Added $${input.amount} from ${input.source}`,
        });
        return { success: true };
      }),
  }),

  // ---- CALENDAR ----
  calendar: router({
    list: protectedProcedure.query(({ ctx }) => db.getCalendarEventsByUser(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        videoId: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        eventType: z.enum(["upload", "deadline", "review", "milestone"]).default("upload"),
        scheduledAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createCalendarEvent({ userId: ctx.user.id, ...input });
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "calendar_event_created",
          entityType: "calendarEvent",
          entityId: id,
          details: `Scheduled: "${input.title}" for ${input.scheduledAt.toISOString()}`,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        scheduledAt: z.date().optional(),
        isCompleted: z.boolean().optional(),
        googleCalendarEventId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateCalendarEvent(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCalendarEvent(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ---- AUDIT LOG ----
  audit: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(({ ctx, input }) => db.getAuditLogsByUser(ctx.user.id, input?.limit)),
  }),

  // ---- NOTIFICATIONS ----
  notify: router({
    send: protectedProcedure
      .input(z.object({
        title: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await notifyOwner(input);
        return { sent: result };
      }),
  }),
});

export type AppRouter = typeof appRouter;
