import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Trash2, Loader2, Flame, CheckCircle2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SOURCE_COLORS: Record<string, string> = {
  trending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  reddit: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  news: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  evergreen: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function ContentResearch() {
  const [niche, setNiche] = useState("");
  const [count, setCount] = useState(10);
  const utils = trpc.useUtils();

  const { data: ideas, isLoading } = trpc.research.list.useQuery();
  const generateMutation = trpc.research.generate.useMutation({
    onSuccess: (data) => {
      utils.research.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`Generated ${data.count} content ideas!`);
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.research.delete.useMutation({
    onSuccess: () => { utils.research.list.invalidate(); toast.success("Idea removed"); },
  });
  const markUsedMutation = trpc.research.markUsed.useMutation({
    onSuccess: () => { utils.research.list.invalidate(); toast.success("Marked as used"); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Research</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-powered research engine that finds viral video ideas from trending topics, Reddit, and news
        </p>
      </div>

      <Card className="glass-card glow-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Niche / Topic</label>
              <Input placeholder="e.g., personal finance, true crime, tech reviews..." value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-secondary/50" />
            </div>
            <div className="w-full md:w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Count</label>
              <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="bg-secondary/50" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => generateMutation.mutate({ niche, count })} disabled={!niche || generateMutation.isPending} className="w-full md:w-auto">
                {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Ideas</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : ideas && ideas.length > 0 ? (
        <div className="grid gap-3">
          {ideas.map((idea) => (
            <Card key={idea.id} className={`glass-card transition-all hover:border-primary/30 ${idea.isUsed ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-sm">{idea.title}</h3>
                      {idea.isUsed && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{idea.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={`text-[10px] capitalize ${SOURCE_COLORS[idea.source || ''] || ''}`}>{idea.source}</Badge>
                      <Badge variant="outline" className="text-[10px]"><Flame className="h-2.5 w-2.5 mr-0.5" />{idea.viralScore}/100</Badge>
                      {(idea.keywords as string[] || []).slice(0, 4).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!idea.isUsed && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markUsedMutation.mutate({ id: idea.id })}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Use
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteMutation.mutate({ id: idea.id })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card"><CardContent className="py-16 text-center">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-1">No content ideas yet</h3>
          <p className="text-sm text-muted-foreground">Enter a niche above and let AI find viral video ideas</p>
        </CardContent></Card>
      )}
    </div>
  );
}
