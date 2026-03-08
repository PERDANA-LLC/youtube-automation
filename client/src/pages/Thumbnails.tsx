import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Sparkles, Loader2, Download, RefreshCw, CheckCircle2, Save, Star, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Thumbnails() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: videos } = trpc.video.list.useQuery();
  const videosWithThumbnails = videos?.filter(v => v.thumbnailUrl) ?? [];

  // Initialize selectedIds from existing saved selections
  useEffect(() => {
    if (videos) {
      const saved = new Set(videos.filter(v => v.thumbnailSaved).map(v => v.id));
      setSelectedIds(saved);
      setHasUnsavedChanges(false);
    }
  }, [videos]);

  const generateMutation = trpc.video.generateThumbnail.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.url || null);
      setErrorMessage(null);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success("Thumbnail generated!");
    },
    onError: (err) => {
      const msg = err.message.includes('temporarily unavailable')
        ? 'The AI image service is temporarily busy. Please wait a moment and try again.'
        : err.message;
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const saveMutation = trpc.video.saveSelectedThumbnails.useMutation({
    onSuccess: (data) => {
      setHasUnsavedChanges(false);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`Saved ${data.count} selected thumbnail(s)!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    if (!selectedVideoId || !prompt) return;
    setErrorMessage(null);
    generateMutation.mutate({ videoId: selectedVideoId, prompt });
  };

  // Multi-select handlers
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

  const selectAll = () => {
    setSelectedIds(new Set(videosWithThumbnails.map(v => v.id)));
    setHasUnsavedChanges(true);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setHasUnsavedChanges(true);
  };

  const handleSaveSelected = () => {
    saveMutation.mutate({ ids: Array.from(selectedIds) });
  };

  const thumbnailSelectedCount = selectedIds.size;
  const thumbnailTotalCount = videosWithThumbnails.length;
  const allThumbnailsSelected = thumbnailTotalCount > 0 && thumbnailSelectedCount === thumbnailTotalCount;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Thumbnail Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">Create eye-catching thumbnails with AI image generation</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Generation Form */}
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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Thumbnail Description</label>
              <Textarea
                placeholder="Describe the thumbnail you want... e.g., 'A dramatic close-up of a stock chart crashing with red arrows, dark moody background'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-secondary/50 min-h-[120px]"
              />
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={!selectedVideoId || !prompt || generateMutation.isPending}>
              {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Thumbnail</>}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="glass-card">
          <CardContent className="p-6">
            {errorMessage && !generatedUrl && (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Image className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-red-400">Generation Failed</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">{errorMessage}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateMutation.isPending}>
                  <RefreshCw className="h-3 w-3 mr-1.5" /> Try Again
                </Button>
              </div>
            )}
            {generatedUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Generated Thumbnail</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerate} disabled={generateMutation.isPending}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                    </Button>
                    <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden border border-border">
                  <img src={generatedUrl} alt="Generated thumbnail" className="w-full aspect-video object-cover" />
                </div>
              </div>
            ) : !errorMessage ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Image className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">Thumbnail Preview</h3>
                <p className="text-sm text-muted-foreground">Your AI-generated thumbnail will appear here</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Thumbnail Gallery with Multi-Select */}
      {videosWithThumbnails.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h2 className="text-lg font-semibold">Thumbnail Gallery</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Select thumbnails to save and manage your collection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {thumbnailSelectedCount}/{thumbnailTotalCount} selected
              </Badge>
              <Button variant="outline" size="sm" onClick={allThumbnailsSelected ? deselectAll : selectAll} className="text-xs">
                {allThumbnailsSelected ? (
                  <><X className="h-3 w-3 mr-1.5" /> Deselect All</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3 mr-1.5" /> Select All</>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videosWithThumbnails.map((v) => {
              const isChecked = selectedIds.has(v.id);
              return (
                <Card
                  key={v.id}
                  className={`glass-card transition-all cursor-pointer overflow-hidden ${
                    isChecked
                      ? 'border-primary/50 glow-border ring-1 ring-primary/20'
                      : 'hover:border-primary/20'
                  }`}
                  onClick={() => toggleSelect(v.id)}
                >
                  <div className="relative">
                    {/* Thumbnail Image */}
                    <img src={v.thumbnailUrl!} alt={v.title} className="w-full aspect-video object-cover" />

                    {/* Checkbox Overlay - Top Left */}
                    <div
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`rounded-md p-0.5 ${isChecked ? 'bg-primary/80' : 'bg-black/50'}`}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(v.id)}
                          className="h-5 w-5 border-white/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                    </div>

                    {/* Saved Star - Top Right */}
                    {isChecked && (
                      <div className="absolute top-2 right-2 z-10">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                      </div>
                    )}

                    {/* Download Button Overlay */}
                    <div
                      className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={v.thumbnailUrl!} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="secondary" className="h-7 text-xs shadow-lg">
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                      </a>
                    </div>

                    {/* Selection Overlay */}
                    {isChecked && (
                      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                    )}
                  </div>

                  {/* Card Footer */}
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium truncate flex-1">{v.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <a
                          href={v.thumbnailUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </a>
                        <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-400">
                          <CheckCircle2 className="h-2 w-2 mr-0.5" /> Done
                        </Badge>
                      </div>
                    </div>
                    {v.thumbnailPrompt && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{v.thumbnailPrompt}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Floating Save Bar */}
      <AnimatePresence>
        {thumbnailTotalCount > 0 && (
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
                    {thumbnailSelectedCount} thumbnail{thumbnailSelectedCount !== 1 ? 's' : ''} selected
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
