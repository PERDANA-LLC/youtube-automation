import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, CheckCircle2, AlertTriangle, Lightbulb, Target, DollarSign, Shield, Palette, TrendingUp, Users, Video, Settings } from "lucide-react";

const GUIDE_SECTIONS = [
  {
    id: "setup",
    icon: Settings,
    title: "Channel Setup",
    color: "text-blue-400",
    items: [
      { title: "Create a Google/YouTube Account", desc: "Use a brand account for team access. Go to YouTube Studio > Create a channel." },
      { title: "Channel Name & Branding", desc: "Choose a memorable, niche-relevant name. Create a professional logo (1:1 ratio, 800x800px) and banner (2560x1440px)." },
      { title: "Channel Description", desc: "Write a keyword-rich description explaining what viewers will learn. Include upload schedule and links." },
      { title: "Channel Keywords", desc: "Add 5-10 relevant keywords in YouTube Studio > Settings > Channel > Basic Info." },
      { title: "Custom URL", desc: "Once eligible (100+ subscribers), claim your custom URL at youtube.com/account." },
      { title: "Verify Your Channel", desc: "Verify via phone to unlock custom thumbnails, live streaming, and videos over 15 minutes." },
    ],
  },
  {
    id: "content",
    icon: Video,
    title: "Content Strategy",
    color: "text-purple-400",
    items: [
      { title: "Niche Selection", desc: "Focus on one profitable niche. Use the AI Niche Finder to analyze CPM rates and competition levels." },
      { title: "Content Pillars", desc: "Define 3-5 content pillars (recurring themes). This helps with consistency and audience expectations." },
      { title: "Upload Schedule", desc: "Commit to a consistent schedule. For shorts: 3-7/week. For long-form: 1-3/week. Consistency beats frequency." },
      { title: "Video Length", desc: "Shorts: 30-60 seconds. Long-form: 8-15 minutes for optimal ad placement (mid-roll ads at 8+ min)." },
      { title: "Hooks & Retention", desc: "First 3 seconds are critical. Use pattern interrupts, curiosity gaps, and open loops to maintain watch time." },
      { title: "Batch Production", desc: "Record/produce multiple videos in one session. Use this platform's pipeline to manage batch workflows." },
    ],
  },
  {
    id: "seo",
    icon: TrendingUp,
    title: "YouTube SEO",
    color: "text-green-400",
    items: [
      { title: "Title Optimization", desc: "Front-load keywords. Use numbers, power words, and keep under 60 characters. Use the SEO Optimizer tool." },
      { title: "Description Best Practices", desc: "First 2 lines appear in search. Include primary keyword in first sentence. Add timestamps, links, and hashtags." },
      { title: "Tags Strategy", desc: "Use 5-15 relevant tags. Include exact match, broad match, and related keywords." },
      { title: "Thumbnail CTR", desc: "Design thumbnails with high contrast, large text (3-5 words max), faces/emotions, and consistent branding." },
      { title: "End Screens & Cards", desc: "Add end screens in the last 20 seconds. Use cards to link related content throughout the video." },
      { title: "Playlists", desc: "Organize videos into playlists. This increases session time and helps YouTube recommend your content." },
    ],
  },
  {
    id: "monetization",
    icon: DollarSign,
    title: "Monetization Requirements",
    color: "text-yellow-400",
    items: [
      { title: "YouTube Partner Program (YPP)", desc: "Requirements: 1,000 subscribers + 4,000 watch hours (last 12 months) OR 1,000 subscribers + 10M Shorts views (last 90 days)." },
      { title: "AdSense Setup", desc: "Link an AdSense account. Ensure your content follows YouTube's advertiser-friendly guidelines." },
      { title: "Revenue Streams", desc: "Ad revenue, channel memberships ($4.99+/mo), Super Chat, merchandise shelf, affiliate marketing, sponsorships." },
      { title: "CPM Optimization", desc: "Higher CPM niches: Finance ($12-36), Legal ($8-25), Tech ($6-18), Health ($5-15). Target US/UK/CA audiences." },
      { title: "Affiliate Marketing", desc: "Add affiliate links in descriptions. Disclose partnerships. Focus on products relevant to your niche." },
      { title: "Sponsorship Rates", desc: "Typical rates: $20-50 per 1,000 views. Negotiate based on engagement rate, not just subscriber count." },
    ],
  },
  {
    id: "growth",
    icon: Users,
    title: "Growth Strategies",
    color: "text-cyan-400",
    items: [
      { title: "Shorts Strategy", desc: "Post Shorts to reach new audiences. Repurpose long-form highlights. Shorts viewers convert to subscribers." },
      { title: "Community Tab", desc: "Post polls, images, and updates. Engage with your audience between uploads to boost algorithm signals." },
      { title: "Collaborations", desc: "Collab with channels of similar size. Cross-promote to tap into new audiences." },
      { title: "Social Media Cross-Promotion", desc: "Share clips on TikTok, Instagram Reels, Twitter. Drive traffic back to YouTube." },
      { title: "Analytics Review", desc: "Check YouTube Studio analytics weekly. Focus on CTR, average view duration, and traffic sources." },
      { title: "A/B Test Thumbnails", desc: "YouTube now offers thumbnail testing. Use it to optimize CTR on your best-performing videos." },
    ],
  },
  {
    id: "compliance",
    icon: Shield,
    title: "Compliance & Best Practices",
    color: "text-red-400",
    items: [
      { title: "Copyright", desc: "Use royalty-free music/footage. Credit sources. Avoid re-uploading others' content without transformation." },
      { title: "Community Guidelines", desc: "No hate speech, harassment, spam, or misleading content. Violations lead to strikes and channel termination." },
      { title: "COPPA Compliance", desc: "If content is for kids, mark it as 'Made for Kids'. This disables comments, notifications, and personalized ads." },
      { title: "FTC Disclosure", desc: "Disclose paid partnerships, affiliate links, and sponsored content. Use YouTube's paid promotion checkbox." },
      { title: "Content ID", desc: "Understand Content ID claims vs. copyright strikes. Claims affect monetization; strikes affect your channel." },
      { title: "Backup Your Content", desc: "Download your videos regularly. Use Google Takeout for full channel backup." },
    ],
  },
];

export default function ChannelGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">YouTube Channel Guide</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete setup guide with best practices, monetization requirements, and compliance checklist
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-blue-400" />
            <p className="text-sm font-semibold">1,000 Subs</p>
            <p className="text-[10px] text-muted-foreground">YPP Requirement</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-400" />
            <p className="text-sm font-semibold">4,000 Hours</p>
            <p className="text-[10px] text-muted-foreground">Watch Time Needed</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm font-semibold">$12-36 CPM</p>
            <p className="text-[10px] text-muted-foreground">Finance Niche</p>
          </CardContent>
        </Card>
      </div>

      {/* Guide Sections */}
      <Accordion type="multiple" defaultValue={["setup"]} className="space-y-3">
        {GUIDE_SECTIONS.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border-none">
            <Card className="glass-card">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg bg-secondary flex items-center justify-center`}>
                    <section.icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-sm">{section.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{section.items.length} items</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4">
                <div className="space-y-3 pt-2">
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Pro Tips */}
      <Card className="glass-card glow-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" /> Pro Tips for Faceless Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Use AI voiceover tools for consistent narration without showing your face",
              "Stock footage + motion graphics = professional-looking videos at low cost",
              "Compilation/listicle formats work great for faceless channels",
              "Automate thumbnail creation with consistent branding templates",
              "Focus on evergreen content that generates views for months/years",
              "Use this platform's pipeline to batch-produce 10-20 videos at once",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5">
                <span className="text-yellow-400 text-xs font-bold mt-0.5">{i + 1}.</span>
                <p className="text-xs text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
