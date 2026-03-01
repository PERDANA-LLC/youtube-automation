import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function ScriptWriter() {
  const [topic, setTopic] = useState("");
  const [videoType, setVideoType] = useState<"short" | "long">("short");
  const [tone, setTone] = useState("engaging and conversational");
  const [includeHook, setIncludeHook] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { data: videos } = trpc.video.list.useQuery();
  const utils = trpc.useUtils();

  const generateMutation = trpc.video.generateScript.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success("Script generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    if (!selectedVideoId) { toast.error("Select a video project first"); return; }
    generateMutation.mutate({ videoId: selectedVideoId, topic, videoType, tone, includeHook, includeCTA });
  };

  const handleCopy = () => {
    if (result?.script) {
      navigator.clipboard.writeText(result.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Script copied!");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Script Writer</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate engaging video scripts with hooks, storytelling, and CTAs</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card glow-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video Project</label>
              <Select value={selectedVideoId?.toString() || ""} onValueChange={(v) => setSelectedVideoId(Number(v))}>
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select a video..." /></SelectTrigger>
                <SelectContent>
                  {videos?.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Topic / Angle</label>
              <Textarea placeholder="What should this video be about?" value={topic} onChange={(e) => setTopic(e.target.value)} className="bg-secondary/50 min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video Type</label>
                <Select value={videoType} onValueChange={(v) => setVideoType(v as "short" | "long")}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (30-60s)</SelectItem>
                    <SelectItem value="long">Long (8-12 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tone</label>
                <Input value={tone} onChange={(e) => setTone(e.target.value)} className="bg-secondary/50" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={includeHook} onCheckedChange={setIncludeHook} />
                <span className="text-sm">Include Hook</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeCTA} onCheckedChange={setIncludeCTA} />
                <span className="text-sm">Include CTA</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={!topic || !selectedVideoId || generateMutation.isPending}>
              {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing Script...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Script</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Generated Script</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{result.wordCount} words</Badge>
                    <Button size="sm" variant="outline" className="h-7" onClick={handleCopy}>
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                {result.hookLine && (
                  <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                    <p className="text-[10px] text-yellow-400 font-medium mb-1">HOOK</p>
                    <p className="text-sm">{result.hookLine}</p>
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-h-[400px] overflow-y-auto">
                  <Streamdown>{result.script}</Streamdown>
                </div>
                {result.ctaLine && (
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <p className="text-[10px] text-green-400 font-medium mb-1">CTA</p>
                    <p className="text-sm">{result.ctaLine}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {result.seoKeywords?.map((kw: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">Script Preview</h3>
                <p className="text-sm text-muted-foreground">Your AI-generated script will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
