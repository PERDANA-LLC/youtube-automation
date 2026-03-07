import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Sparkles, Loader2, Copy, Check, Lightbulb, Save, X, Plus, ClipboardCopy, CheckCircle2, FileText, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type SEOResult = {
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  seoScore: number;
  suggestions: string[];
};

export default function SEOOptimizer() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [niche, setNiche] = useState("");

  // Editable SEO result fields
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editScore, setEditScore] = useState(0);
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: videos } = trpc.video.list.useQuery();

  const optimizeMutation = trpc.video.optimizeSEO.useMutation({
    onSuccess: (data) => {
      setEditTitle(data.seoTitle);
      setEditDescription(data.seoDescription);
      setEditTags(data.tags || []);
      setEditScore(data.seoScore);
      setEditSuggestions(data.suggestions || []);
      setHasResult(true);
      setIsSaved(true); // Auto-saved on generation
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`SEO optimized! Score: ${data.seoScore}/100`);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = trpc.video.saveSEO.useMutation({
    onSuccess: () => {
      setIsSaved(true);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success("SEO results saved successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleCopyAll = () => {
    const allText = [
      `Title: ${editTitle}`,
      ``,
      `Description:`,
      editDescription,
      ``,
      `Tags: ${editTags.join(", ")}`,
      ``,
      `SEO Score: ${editScore}/100`,
      ``,
      `Suggestions:`,
      ...editSuggestions.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");
    navigator.clipboard.writeText(allText);
    setCopiedField("all");
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("All SEO results copied!");
  };

  const handleVideoSelect = (videoId: string) => {
    const id = Number(videoId);
    setSelectedVideoId(id);
    const video = videos?.find(v => v.id === id);
    if (video) {
      setTitle(video.title);
      setDescription(video.description || "");
      // Load existing SEO data if available
      if (video.seoTitle) {
        setEditTitle(video.seoTitle);
        setEditDescription(video.seoDescription || "");
        setEditTags((video.seoTags as string[]) || []);
        setEditScore(video.seoScore || 0);
        setEditSuggestions((video as any).seoSuggestions || []);
        setHasResult(true);
        setIsSaved(true);
      } else {
        setEditTitle("");
        setEditDescription("");
        setEditTags([]);
        setEditScore(0);
        setEditSuggestions([]);
        setHasResult(false);
        setIsSaved(false);
      }
    }
  };

  const handleSave = () => {
    if (!selectedVideoId) return;
    saveMutation.mutate({
      videoId: selectedVideoId,
      seoTitle: editTitle,
      seoDescription: editDescription,
      seoTags: editTags,
      seoScore: editScore,
      seoSuggestions: editSuggestions,
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    setEditTags(prev => [...prev, newTag.trim()]);
    setNewTag("");
    setIsSaved(false);
  };

  const handleRemoveTag = (index: number) => {
    setEditTags(prev => prev.filter((_, i) => i !== index));
    setIsSaved(false);
  };

  // Track edits to mark as unsaved
  const handleEditChange = () => {
    setIsSaved(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO Optimizer</h1>
          <p className="text-muted-foreground text-sm mt-1">Optimize titles, descriptions, and tags for maximum YouTube discoverability</p>
        </div>
        {hasResult && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="text-xs"
            >
              {copiedField === "all" ? <Check className="h-3 w-3 mr-1.5" /> : <ClipboardCopy className="h-3 w-3 mr-1.5" />}
              Copy All
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaved || saveMutation.isPending || !selectedVideoId}
              className="text-xs"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Saving...</>
              ) : isSaved ? (
                <><CheckCircle2 className="h-3 w-3 mr-1.5" /> Saved</>
              ) : (
                <><Save className="h-3 w-3 mr-1.5" /> Save All Results</>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column: Input Controls */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card glow-border">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video Project</label>
                <Select value={selectedVideoId?.toString() || ""} onValueChange={handleVideoSelect}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select a video..." /></SelectTrigger>
                  <SelectContent>
                    {videos?.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{v.title}</span>
                          {v.seoScore && (
                            <Badge variant="secondary" className="text-[10px] ml-1">
                              SEO: {v.seoScore}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
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
              <Button
                className="w-full"
                onClick={() => selectedVideoId && optimizeMutation.mutate({ videoId: selectedVideoId, title, description, niche })}
                disabled={!selectedVideoId || !title || optimizeMutation.isPending}
              >
                {optimizeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Optimizing...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> {hasResult ? "Re-Optimize SEO" : "Optimize SEO"}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: SEO Results (editable) */}
        <div className="lg:col-span-3 space-y-4">
          {hasResult ? (
            <>
              {/* Score Bar */}
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      SEO Score
                    </h3>
                    <span className={`text-2xl font-bold ${editScore >= 80 ? 'text-green-400' : editScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {editScore}/100
                    </span>
                  </div>
                  <Progress value={editScore} className="h-2.5" />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">Poor</span>
                    <span className="text-[10px] text-muted-foreground">Average</span>
                    <span className="text-[10px] text-muted-foreground">Excellent</span>
                  </div>
                </CardContent>
              </Card>

              {/* Editable SEO Title */}
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> OPTIMIZED TITLE
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleCopy(editTitle, "title")}
                    >
                      {copiedField === "title" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copy
                    </Button>
                  </div>
                  <Input
                    value={editTitle}
                    onChange={(e) => { setEditTitle(e.target.value); handleEditChange(); }}
                    className="bg-secondary/30 font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">{editTitle.length}/100 characters</p>
                </CardContent>
              </Card>

              {/* Editable SEO Description */}
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> OPTIMIZED DESCRIPTION
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleCopy(editDescription, "desc")}
                    >
                      {copiedField === "desc" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => { setEditDescription(e.target.value); handleEditChange(); }}
                    className="bg-secondary/30 min-h-[160px] text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">{editDescription.split(/\s+/).filter(Boolean).length} words</p>
                </CardContent>
              </Card>

              {/* Editable Tags */}
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> TAGS ({editTags.length})
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleCopy(editTags.join(", "), "tags")}
                    >
                      {copiedField === "tags" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copy All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {editTags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-[11px] pl-2 pr-1 py-1 flex items-center gap-1 group hover:bg-destructive/20 transition-colors"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(i)}
                          className="h-3.5 w-3.5 rounded-full flex items-center justify-center hover:bg-destructive/30 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      placeholder="Add a tag..."
                      className="bg-secondary/30 text-sm h-8"
                    />
                    <Button size="sm" variant="outline" className="h-8 px-3" onClick={handleAddTag} disabled={!newTag.trim()}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions */}
              {editSuggestions.length > 0 && (
                <Card className="glass-card border-yellow-500/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                      <label className="text-xs font-medium text-yellow-400">IMPROVEMENT SUGGESTIONS</label>
                    </div>
                    <ul className="space-y-2">
                      {editSuggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-[10px] font-bold text-yellow-400/60 mt-0.5 shrink-0">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Save Button (bottom) */}
              <div className="flex items-center gap-3">
                <Button
                  className="flex-1 h-11"
                  onClick={handleSave}
                  disabled={isSaved || saveMutation.isPending || !selectedVideoId}
                >
                  {saveMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving All Results...</>
                  ) : isSaved ? (
                    <><CheckCircle2 className="h-4 w-4 mr-2" /> All Results Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save All SEO Results</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={handleCopyAll}
                >
                  {copiedField === "all" ? <Check className="h-4 w-4 mr-2" /> : <ClipboardCopy className="h-4 w-4 mr-2" />}
                  Copy All
                </Button>
              </div>
            </>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp className="h-14 w-14 text-muted-foreground/20 mb-4" />
                  <h3 className="font-semibold mb-1">SEO Results</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Select a video and click "Optimize SEO" to generate optimized titles, descriptions, tags, and improvement suggestions
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
