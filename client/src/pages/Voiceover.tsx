import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Play, Pause, Volume2, Info, CheckCircle2, Loader2, FileText, Upload, Wand2, Download, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

const VOICE_OPTIONS = [
  { id: "alloy", name: "Alloy", desc: "Neutral, balanced", color: "text-blue-400" },
  { id: "echo", name: "Echo", desc: "Warm, deep", color: "text-purple-400" },
  { id: "fable", name: "Fable", desc: "Expressive, British", color: "text-green-400" },
  { id: "onyx", name: "Onyx", desc: "Deep, authoritative", color: "text-orange-400" },
  { id: "nova", name: "Nova", desc: "Friendly, warm", color: "text-pink-400" },
  { id: "shimmer", name: "Shimmer", desc: "Clear, bright", color: "text-cyan-400" },
];

type GenerationStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
};

const INITIAL_STEPS: GenerationStep[] = [
  { id: "prepare", label: "Preparing script text", status: "pending" },
  { id: "tts", label: "Generating speech with AI voice", status: "pending" },
  { id: "upload", label: "Uploading audio to storage", status: "pending" },
  { id: "save", label: "Saving voiceover to video project", status: "pending" },
];

export default function Voiceover() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [steps, setSteps] = useState<GenerationStep[]>(INITIAL_STEPS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    url: string;
    voice: string;
    wordCount: number;
    charCount: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: videos, refetch: refetchVideos } = trpc.video.list.useQuery();
  const videosWithScripts = videos?.filter(v => v.scriptContent) ?? [];
  const selectedVideo = videosWithScripts.find(v => v.id === selectedVideoId);

  const generateVoiceover = trpc.video.generateVoiceover.useMutation({
    onSuccess: (data) => {
      setGenerationResult(data);
      setSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
      setIsGenerating(false);
      refetchVideos();
      toast.success("Voiceover generated successfully!");
    },
    onError: (error) => {
      setSteps(prev => {
        const activeIdx = prev.findIndex(s => s.status === "active");
        return prev.map((s, i) => ({
          ...s,
          status: i === activeIdx ? "error" as const : s.status,
        }));
      });
      setIsGenerating(false);
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  // Simulate step progression during the mutation
  const advanceSteps = useCallback(() => {
    if (!isGenerating) return;

    const timings = [500, 2000, 8000, 12000]; // ms for each step to become active
    timings.forEach((delay, idx) => {
      setTimeout(() => {
        setSteps(prev => {
          // Don't advance if we already got a result or error
          const hasError = prev.some(s => s.status === "error");
          const allDone = prev.every(s => s.status === "done");
          if (hasError || allDone) return prev;

          return prev.map((s, i) => {
            if (i < idx) return { ...s, status: "done" as const };
            if (i === idx) return { ...s, status: "active" as const };
            return s;
          });
        });
      }, delay);
    });
  }, [isGenerating]);

  const handleGenerate = () => {
    if (!selectedVideoId) return;

    setGenerationResult(null);
    setSteps(INITIAL_STEPS.map((s, i) => ({
      ...s,
      status: i === 0 ? "active" as const : "pending" as const,
    })));
    setIsGenerating(true);
    setIsPlaying(false);
    setAudioProgress(0);

    // Start step progression
    setTimeout(() => advanceSteps(), 0);

    generateVoiceover.mutate({
      videoId: selectedVideoId,
      voice: selectedVoice as any,
    });
  };

  // Audio playback handlers
  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setAudioCurrentTime(audioRef.current.currentTime);
    if (audioRef.current.duration) {
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(100);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Determine the audio URL to display (either from generation result or existing video)
  const activeAudioUrl = generationResult?.url || selectedVideo?.voiceoverUrl;
  const activeVoice = generationResult?.voice || selectedVideo?.voiceoverVoice;

  // Calculate overall progress percentage
  const completedSteps = steps.filter(s => s.status === "done").length;
  const overallProgress = isGenerating
    ? Math.min(((completedSteps + (steps.some(s => s.status === "active") ? 0.5 : 0)) / steps.length) * 100, 95)
    : completedSteps === steps.length && generationResult
      ? 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voiceover Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate natural-sounding voiceovers from your scripts with AI-powered text-to-speech
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column: Controls */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card glow-border">
            <CardContent className="p-6 space-y-4">
              {/* Video Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select Video with Script</label>
                <Select
                  value={selectedVideoId?.toString() || ""}
                  onValueChange={(v) => {
                    setSelectedVideoId(Number(v));
                    setGenerationResult(null);
                    setSteps(INITIAL_STEPS);
                    setIsPlaying(false);
                    setAudioProgress(0);
                  }}
                >
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Choose a video..." /></SelectTrigger>
                  <SelectContent>
                    {videosWithScripts.length === 0 && (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        No videos with scripts found. Generate a script first.
                      </div>
                    )}
                    {videosWithScripts.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span>{v.title}</span>
                          <Badge variant="secondary" className="text-[10px] ml-1">{v.scriptWordCount} words</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">AI Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {VOICE_OPTIONS.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      disabled={isGenerating}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedVoice === voice.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <Volume2 className={`h-3.5 w-3.5 ${selectedVoice === voice.id ? voice.color : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{voice.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{voice.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full h-11"
                disabled={!selectedVideoId || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Voiceover...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" /> Generate Voiceover
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Script Preview */}
          {selectedVideo?.scriptContent && (
            <Card className="glass-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Script Preview</h3>
                  <Badge variant="secondary" className="text-[10px]">{selectedVideo.scriptWordCount} words</Badge>
                </div>
                <div className="text-xs text-muted-foreground max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed bg-secondary/20 rounded-lg p-3">
                  {selectedVideo.scriptContent}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Progress + Result */}
        <div className="lg:col-span-3 space-y-4">
          {/* Generation Progress */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Generation Progress</h3>
                {isGenerating && (
                  <Badge variant="outline" className="text-[10px] animate-pulse bg-primary/10 text-primary">
                    Processing...
                  </Badge>
                )}
                {!isGenerating && generationResult && (
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                  </Badge>
                )}
                {!isGenerating && steps.some(s => s.status === "error") && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400">
                    <AlertCircle className="h-3 w-3 mr-1" /> Failed
                  </Badge>
                )}
              </div>

              {/* Overall Progress Bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              {/* Step-by-Step Progress */}
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                      step.status === "active"
                        ? "bg-primary/5 border border-primary/20"
                        : step.status === "done"
                          ? "bg-green-500/5 border border-green-500/10"
                          : step.status === "error"
                            ? "bg-red-500/5 border border-red-500/10"
                            : "bg-secondary/20 border border-transparent"
                    }`}
                  >
                    {/* Step Icon */}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === "active"
                        ? "bg-primary/10"
                        : step.status === "done"
                          ? "bg-green-500/10"
                          : step.status === "error"
                            ? "bg-red-500/10"
                            : "bg-secondary/30"
                    }`}>
                      {step.status === "active" && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                      {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                      {step.status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
                      {step.status === "pending" && (
                        <span className="text-xs text-muted-foreground font-medium">{i + 1}</span>
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        step.status === "active" ? "text-primary" :
                        step.status === "done" ? "text-green-400" :
                        step.status === "error" ? "text-red-400" :
                        "text-muted-foreground"
                      }`}>
                        {step.label}
                      </p>
                      {step.status === "active" && step.id === "tts" && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          This may take 10-30 seconds depending on script length...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* No video selected state */}
              {!selectedVideoId && !isGenerating && !generationResult && (
                <div className="text-center py-8 mt-4 border border-dashed border-border rounded-lg">
                  <Mic className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Select a video with a script to begin</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audio Result */}
          {activeAudioUrl && (
            <Card className="glass-card glow-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Voiceover Result</h3>
                  <div className="flex items-center gap-2">
                    {activeVoice && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Volume2 className="h-2.5 w-2.5 mr-1" />
                        {VOICE_OPTIONS.find(v => v.id === activeVoice)?.name || activeVoice}
                      </Badge>
                    )}
                    {generationResult && (
                      <Badge variant="secondary" className="text-[10px]">
                        {generationResult.wordCount} words
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Audio Player */}
                <div className="bg-secondary/30 rounded-xl p-5 space-y-4">
                  {/* Waveform Visualization (simplified) */}
                  <div className="flex items-center gap-1 h-12 justify-center">
                    {Array.from({ length: 40 }).map((_, i) => {
                      const height = Math.random() * 80 + 20;
                      const isActive = (i / 40) * 100 <= audioProgress;
                      return (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all duration-150 ${
                            isActive ? "bg-primary" : "bg-muted-foreground/20"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayback}
                      className="h-12 w-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 text-primary-foreground" />
                      ) : (
                        <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1">
                      <Progress value={audioProgress} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatTime(audioCurrentTime)}</span>
                        <span>{audioDuration > 0 ? formatTime(audioDuration) : "--:--"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={activeAudioUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Download className="h-3 w-3 mr-1.5" /> Download MP3
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={isGenerating}
                      onClick={handleGenerate}
                    >
                      <RotateCcw className="h-3 w-3 mr-1.5" /> Regenerate
                    </Button>
                  </div>
                </div>

                {/* Hidden HTML5 Audio Element */}
                <audio
                  ref={audioRef}
                  src={activeAudioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnded}
                  preload="metadata"
                />
              </CardContent>
            </Card>
          )}

          {/* Completed Voiceovers List */}
          {videos?.filter(v => v.voiceoverUrl).length ? (
            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 text-sm">All Completed Voiceovers</h3>
                <div className="space-y-2">
                  {videos.filter(v => v.voiceoverUrl).map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                        selectedVideoId === v.id
                          ? "bg-primary/5 border border-primary/20"
                          : "bg-secondary/30 hover:bg-secondary/50 border border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedVideoId(v.id);
                        setGenerationResult(null);
                        setSteps(INITIAL_STEPS.map(s => ({ ...s, status: "done" as const })));
                      }}
                    >
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <Play className="h-3.5 w-3.5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Voice: {VOICE_OPTIONS.find(vo => vo.id === v.voiceoverVoice)?.name || v.voiceoverVoice || "Default"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Done
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
