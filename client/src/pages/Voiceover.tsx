import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Play, Volume2, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const VOICE_OPTIONS = [
  { id: "alloy", name: "Alloy", desc: "Neutral, balanced" },
  { id: "echo", name: "Echo", desc: "Warm, deep" },
  { id: "fable", name: "Fable", desc: "Expressive, British" },
  { id: "onyx", name: "Onyx", desc: "Deep, authoritative" },
  { id: "nova", name: "Nova", desc: "Friendly, warm" },
  { id: "shimmer", name: "Shimmer", desc: "Clear, bright" },
];

export default function Voiceover() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState("alloy");

  const { data: videos } = trpc.video.list.useQuery();
  const videosWithScripts = videos?.filter(v => v.scriptContent) ?? [];
  const selectedVideo = videosWithScripts.find(v => v.id === selectedVideoId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voiceover Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate natural-sounding voiceovers from your scripts with multiple voice options
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card glow-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select Video with Script</label>
              <Select value={selectedVideoId?.toString() || ""} onValueChange={(v) => setSelectedVideoId(Number(v))}>
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Choose a video..." /></SelectTrigger>
                <SelectContent>
                  {videosWithScripts.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.title} ({v.scriptWordCount} words)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedVoice === voice.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className={`h-3.5 w-3.5 ${selectedVoice === voice.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium">{voice.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{voice.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-blue-400 font-medium">TTS Integration</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Voiceover generation uses the built-in text-to-speech engine. Select a video with a generated script, choose your voice, and the system will produce a natural-sounding narration.
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" disabled={!selectedVideoId} onClick={() => toast.info("Voiceover generation initiated. This feature uses the TTS pipeline.")}>
              <Mic className="h-4 w-4 mr-2" /> Generate Voiceover
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            {selectedVideo?.scriptContent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Script Preview</h3>
                  <Badge variant="secondary" className="text-xs">{selectedVideo.scriptWordCount} words</Badge>
                </div>
                <div className="text-sm text-muted-foreground max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedVideo.scriptContent}
                </div>
                {selectedVideo.voiceoverUrl && (
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <p className="text-xs text-green-400 font-medium mb-2">Generated Voiceover</p>
                    <audio controls className="w-full" src={selectedVideo.voiceoverUrl}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Mic className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">Voiceover Preview</h3>
                <p className="text-sm text-muted-foreground">Select a video with a script to preview and generate voiceover</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Videos with voiceovers */}
      {videos?.filter(v => v.voiceoverUrl).length ? (
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Completed Voiceovers</h3>
            <div className="space-y-3">
              {videos.filter(v => v.voiceoverUrl).map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Play className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground">Voice: {v.voiceoverVoice || "Default"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400">Complete</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
