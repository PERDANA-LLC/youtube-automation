import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Loader2, Clock, Sparkles, FileText, Image, TrendingUp, Calendar, DollarSign, Compass, Mic, Play } from "lucide-react";

const ACTION_CONFIG: Record<string, { icon: any; color: string }> = {
  niche_discovered: { icon: Compass, color: "text-blue-400" },
  niche_selected: { icon: Compass, color: "text-blue-400" },
  ideas_generated: { icon: Sparkles, color: "text-purple-400" },
  script_generated: { icon: FileText, color: "text-yellow-400" },
  thumbnail_generated: { icon: Image, color: "text-pink-400" },
  seo_optimized: { icon: TrendingUp, color: "text-green-400" },
  video_created: { icon: Play, color: "text-cyan-400" },
  video_status_updated: { icon: Play, color: "text-cyan-400" },
  calendar_event_created: { icon: Calendar, color: "text-orange-400" },
  revenue_added: { icon: DollarSign, color: "text-emerald-400" },
  analytics_added: { icon: TrendingUp, color: "text-blue-400" },
  voiceover_generated: { icon: Mic, color: "text-orange-400" },
};

export default function AuditLog() {
  const { data: logs, isLoading } = trpc.audit.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete activity history of all automation actions</p>
      </div>

      <Card className="glass-card">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : logs && logs.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1">
                {logs.map((log, i) => {
                  const config = ACTION_CONFIG[log.action] || { icon: ClipboardList, color: "text-muted-foreground" };
                  const Icon = config.icon;
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        {i < logs.length - 1 && <div className="w-px h-6 bg-border/50 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{log.action.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="text-sm">{log.details || log.action}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-16">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-semibold mb-1">No activity yet</h3>
              <p className="text-sm text-muted-foreground">Actions will be logged here as you use the platform</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
