import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Sparkles, Loader2, Copy, Check, Lightbulb } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SEOOptimizer() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [niche, setNiche] = useState("");
  const [result, setResult] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: videos } = trpc.video.list.useQuery();

  const optimizeMutation = trpc.video.optimizeSEO.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`SEO optimized! Score: ${data.seoScore}/100`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied!");
  };

  const handleVideoSelect = (videoId: string) => {
    const id = Number(videoId);
    setSelectedVideoId(id);
    const video = videos?.find(v => v.id === id);
    if (video) {
      setTitle(video.title);
      setDescription(video.description || "");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEO Optimizer</h1>
        <p className="text-muted-foreground text-sm mt-1">Optimize titles, descriptions, and tags for maximum YouTube discoverability</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card glow-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video Project</label>
              <Select value={selectedVideoId?.toString() || ""} onValueChange={handleVideoSelect}>
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select a video..." /></SelectTrigger>
                <SelectContent>
                  {videos?.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary/50" placeholder="Enter video title..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary/50 min-h-[80px]" placeholder="Brief description..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Niche (optional)</label>
              <Input value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-secondary/50" placeholder="e.g., personal finance" />
            </div>
            <Button className="w-full" onClick={() => selectedVideoId && optimizeMutation.mutate({ videoId: selectedVideoId, title, description, niche })} disabled={!selectedVideoId || !title || optimizeMutation.isPending}>
              {optimizeMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Optimizing...</> : <><Sparkles className="h-4 w-4 mr-2" /> Optimize SEO</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">SEO Results</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Score:</span>
                    <span className={`text-lg font-bold ${result.seoScore >= 80 ? 'text-green-400' : result.seoScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {result.seoScore}/100
                    </span>
                  </div>
                </div>
                <Progress value={result.seoScore} className="h-2" />

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground">OPTIMIZED TITLE</span>
                      <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => handleCopy(result.seoTitle, "title")}>
                        {copiedField === "title" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-sm font-medium">{result.seoTitle}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground">OPTIMIZED DESCRIPTION</span>
                      <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => handleCopy(result.seoDescription, "desc")}>
                        {copiedField === "desc" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground max-h-[120px] overflow-y-auto whitespace-pre-wrap">{result.seoDescription}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30">
                    <span className="text-[10px] font-medium text-muted-foreground block mb-2">TAGS</span>
                    <div className="flex flex-wrap gap-1">
                      {result.tags?.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>

                  {result.suggestions?.length > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                      <div className="flex items-center gap-1 mb-2">
                        <Lightbulb className="h-3 w-3 text-yellow-400" />
                        <span className="text-[10px] font-medium text-yellow-400">SUGGESTIONS</span>
                      </div>
                      <ul className="space-y-1">
                        {result.suggestions.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">SEO Results</h3>
                <p className="text-sm text-muted-foreground">Optimized metadata will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
