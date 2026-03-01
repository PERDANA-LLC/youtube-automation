import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Compass,
  FileText,
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useLocation } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  researching: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  scripting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  voiceover: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  thumbnail: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  seo: "bg-green-500/10 text-green-400 border-green-500/20",
  scheduled: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: videoStats } = trpc.video.stats.useQuery();
  const { data: analyticsSummary } = trpc.analytics.summary.useQuery();
  const { data: revenueSummary } = trpc.revenue.summary.useQuery();
  const { data: videos } = trpc.video.list.useQuery();
  const { data: auditLogs } = trpc.audit.list.useQuery({ limit: 8 });

  const recentVideos = videos?.slice(0, 5) ?? [];

  const quickActions = [
    { icon: Compass, label: "Find Niche", path: "/niche-finder", color: "text-blue-400" },
    { icon: Zap, label: "Research Ideas", path: "/content-research", color: "text-purple-400" },
    { icon: FileText, label: "Write Script", path: "/script-writer", color: "text-yellow-400" },
    { icon: Play, label: "New Video", path: "/video-pipeline", color: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your YouTube automation command center
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{videoStats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analyticsSummary ? Number(analyticsSummary.totalViews).toLocaleString() : "0"}
                </p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${analyticsSummary ? Number(analyticsSummary.avgCpm).toFixed(1) : "0"}
                </p>
                <p className="text-xs text-muted-foreground">Avg CPM</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${revenueSummary ? Number(revenueSummary.totalRevenue).toFixed(0) : "0"}
                </p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 bg-secondary/50 hover:bg-accent transition-all"
                onClick={() => setLocation(action.path)}
              >
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pipeline Status */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Pipeline Status</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/video-pipeline")} className="text-xs">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {videoStats?.byStatus && Object.keys(videoStats.byStatus).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(videoStats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[11px] capitalize ${STATUS_COLORS[status] || ''}`}>
                        {status}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No videos yet. Start your first project!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/audit-log")} className="text-xs">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 py-1.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{log.details || log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No activity yet. Start automating!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Videos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/video-pipeline")} className="text-xs">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentVideos.map((video) => (
                <div key={video.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
                        <Play className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{video.videoType} video</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[11px] capitalize shrink-0 ${STATUS_COLORS[video.status] || ''}`}>
                    {video.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
