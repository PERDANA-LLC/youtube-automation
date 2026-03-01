import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Sparkles, Loader2, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Thumbnails() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: videos } = trpc.video.list.useQuery();

  const generateMutation = trpc.video.generateThumbnail.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.url || null);
      utils.video.list.invalidate();
      utils.audit.list.invalidate();
      toast.success("Thumbnail generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    if (!selectedVideoId || !prompt) return;
    generateMutation.mutate({ videoId: selectedVideoId, prompt });
  };

  const videosWithThumbnails = videos?.filter(v => v.thumbnailUrl) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Thumbnail Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">Create eye-catching thumbnails with AI image generation</p>
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

        <Card className="glass-card">
          <CardContent className="p-6">
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Image className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">Thumbnail Preview</h3>
                <p className="text-sm text-muted-foreground">Your AI-generated thumbnail will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gallery */}
      {videosWithThumbnails.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Thumbnail Gallery</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {videosWithThumbnails.map((v) => (
                <div key={v.id} className="group relative rounded-lg overflow-hidden border border-border">
                  <img src={v.thumbnailUrl!} alt={v.title} className="w-full aspect-video object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-xs text-white truncate">{v.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
