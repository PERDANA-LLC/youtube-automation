import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Sparkles, Loader2, Copy, Check, Save, CheckCircle2, X, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";

export default function ScriptWriter() {
  const [topic, setTopic] = useState("");
  const [videoType, setVideoType] = useState<"short" | "long">("short");
  const [tone, setTone] = useState("engaging and conversational");
  const [includeHook, setIncludeHook] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: videos } = trpc.video.list.useQuery();
  const utils = trpc.useUtils();

  // Videos that have scripts
  const videosWithScripts = videos?.filter(v => v.scriptContent) ?? [];

  // Initialize selectedIds from existing saved selections
  useEffect(() => {
    if (videos) {
      const saved = new Set(videos.filter(v => v.scriptSaved).map(v => v.id));
      setSelectedIds(saved);
      setHasUnsavedChanges(false);
    }
  }, [videos]);

  const generateMutation = trpc.video.generateScript.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success("Script generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = trpc.video.saveSelectedScripts.useMutation({
    onSuccess: (data) => {
      setHasUnsavedChanges(false);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`Saved ${data.count} selected script(s)!`);
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

  const handleCopyScript = (scriptContent: string) => {
    navigator.clipboard.writeText(scriptContent);
    toast.success("Script copied to clipboard!");
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(videosWithScripts.map(v => v.id)));
    setHasUnsavedChanges(true);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setHasUnsavedChanges(true);
  };

  const handleSaveSelected = () => {
    saveMutation.mutate({ ids: Array.from(selectedIds) });
  };

  const selectedCount = selectedIds.size;
  const totalCount = videosWithScripts.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Script Writer</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate engaging video scripts with hooks, storytelling, and CTAs</p>
      </div>

      {/* Script Generation Form */}
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

        {/* Live Result Preview */}
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

      {/* Saved Scripts Section */}
      {videosWithScripts.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h2 className="text-lg font-semibold">Generated Scripts</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Select scripts to save and manage your collection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {selectedCount}/{totalCount} selected
              </Badge>
              <Button variant="outline" size="sm" onClick={allSelected ? deselectAll : selectAll} className="text-xs">
                {allSelected ? (
                  <><X className="h-3 w-3 mr-1.5" /> Deselect All</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3 mr-1.5" /> Select All</>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {videosWithScripts.map((video) => {
              const isChecked = selectedIds.has(video.id);
              const isExpanded = expandedIds.has(video.id);
              return (
                <Card
                  key={video.id}
                  className={`glass-card transition-all ${
                    isChecked
                      ? 'border-primary/50 glow-border bg-primary/[0.02]'
                      : 'hover:border-primary/20'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-0.5 shrink-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(video.id)}
                          className="h-5 w-5"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-sm truncate">{video.title}</h3>
                          {isChecked && <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <Badge variant="secondary" className="text-[10px]">{video.scriptWordCount} words</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{video.videoType}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize bg-blue-500/5 text-blue-400 border-blue-500/20">{video.status}</Badge>
                        </div>

                        {/* Expandable Script Preview */}
                        <div
                          className={`text-xs text-muted-foreground overflow-hidden transition-all duration-300 ${
                            isExpanded ? 'max-h-[500px]' : 'max-h-[60px]'
                          }`}
                        >
                          <div className={`prose prose-invert prose-xs ${isExpanded ? '' : 'line-clamp-3'}`}>
                            <Streamdown>{video.scriptContent || ''}</Streamdown>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleExpand(video.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleCopyScript(video.scriptContent || '')}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Floating Save Bar */}
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="glass-card border-primary/30 shadow-2xl shadow-primary/10">
              <CardContent className="px-6 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${hasUnsavedChanges ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {selectedCount} script{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="h-6 w-px bg-border" />
                <Button
                  size="sm"
                  onClick={handleSaveSelected}
                  disabled={saveMutation.isPending || !hasUnsavedChanges}
                  className="whitespace-nowrap"
                >
                  {saveMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...</>
                  ) : !hasUnsavedChanges ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Saved</>
                  ) : (
                    <><Save className="h-3.5 w-3.5 mr-1.5" /> Save Selected</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
