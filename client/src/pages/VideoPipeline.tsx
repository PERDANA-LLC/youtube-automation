import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Play, Trash2, Loader2, ArrowRight, FileText, Mic, Image, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const STATUSES = ["idea", "researching", "scripting", "voiceover", "thumbnail", "seo", "scheduled", "published"] as const;
const STATUS_ICONS: Record<string, any> = {
  idea: Play, researching: FileText, scripting: FileText, voiceover: Mic, thumbnail: Image, seo: TrendingUp, scheduled: Calendar, published: CheckCircle2,
};
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

export default function VideoPipeline() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [videoType, setVideoType] = useState<"short" | "long">("short");
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: videos, isLoading } = trpc.video.list.useQuery();
  const createMutation = trpc.video.create.useMutation({
    onSuccess: () => {
      utils.video.list.invalidate();
      utils.video.stats.invalidate();
      utils.audit.list.invalidate();
      setTitle("");
      setDialogOpen(false);
      toast.success("Video project created!");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.video.delete.useMutation({
    onSuccess: () => {
      utils.video.list.invalidate();
      utils.video.stats.invalidate();
      toast.success("Video deleted");
    },
  });
  const updateMutation = trpc.video.update.useMutation({
    onSuccess: () => {
      utils.video.list.invalidate();
      utils.video.stats.invalidate();
      utils.audit.list.invalidate();
    },
  });

  const getNextStatus = (current: string) => {
    const idx = STATUSES.indexOf(current as any);
    return idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Video Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your content from idea to published video</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Video</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Video Project</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input placeholder="Video title..." value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Type</label>
                <Select value={videoType} onValueChange={(v) => setVideoType(v as "short" | "long")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (under 60s)</SelectItem>
                    <SelectItem value="long">Long-form (8-15 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate({ title, videoType })} disabled={!title || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Progress */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {STATUSES.map((status, i) => {
              const Icon = STATUS_ICONS[status];
              const count = videos?.filter(v => v.status === status).length ?? 0;
              return (
                <div key={status} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[70px]">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${count > 0 ? 'bg-primary/20' : 'bg-secondary'}`}>
                      <Icon className={`h-4 w-4 ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className="text-[10px] mt-1 capitalize text-muted-foreground">{status}</span>
                    <span className="text-xs font-semibold">{count}</span>
                  </div>
                  {i < STATUSES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/30 mx-1" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : videos && videos.length > 0 ? (
        <div className="grid gap-3">
          {videos.map((video) => {
            const nextStatus = getNextStatus(video.status);
            return (
              <Card key={video.id} className="glass-card hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt="" className="h-14 w-24 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-14 w-24 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Play className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{video.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[video.status]}`}>{video.status}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{video.videoType}</Badge>
                        {video.seoScore && <Badge variant="outline" className="text-[10px]">SEO: {video.seoScore}/100</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(video.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {nextStatus && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateMutation.mutate({ id: video.id, status: nextStatus })}>
                          <ArrowRight className="h-3 w-3 mr-1" /> {nextStatus}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteMutation.mutate({ id: video.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card"><CardContent className="py-16 text-center">
          <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-1">No videos in pipeline</h3>
          <p className="text-sm text-muted-foreground">Create your first video project to get started</p>
        </CardContent></Card>
      )}
    </div>
  );
}
