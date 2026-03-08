import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Clapperboard,
  Sparkles,
  Camera,
  Film,
  CheckCircle2,
  Clock,
  Loader2,
  Download,
  Save,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  FileVideo,
  Wand2,
  Volume2,
  VolumeX,
} from "lucide-react";

const VIDEO_STYLES = [
  { value: "cinematic-realism", label: "Cinematic Realism", desc: "High-fidelity, photorealistic footage" },
  { value: "anime", label: "Anime / Manga", desc: "Japanese animation style" },
  { value: "3d-animation", label: "3D Animation", desc: "Pixar/Disney-style 3D rendering" },
  { value: "motion-graphics", label: "Motion Graphics", desc: "Clean, modern graphic animations" },
  { value: "watercolor", label: "Watercolor Art", desc: "Soft, painted watercolor aesthetic" },
  { value: "cyberpunk", label: "Cyberpunk Noir", desc: "Neon-lit, dark futuristic style" },
  { value: "documentary", label: "Documentary", desc: "Realistic, observational footage" },
  { value: "retro-vhs", label: "Retro VHS", desc: "Nostalgic 80s/90s video look" },
  { value: "minimalist", label: "Minimalist", desc: "Clean, simple, elegant visuals" },
  { value: "fantasy", label: "Fantasy Epic", desc: "Magical, otherworldly environments" },
];

const DURATIONS = [
  { value: "4", label: "4 seconds", desc: "Quick clip" },
  { value: "8", label: "8 seconds", desc: "Standard" },
  { value: "16", label: "16 seconds", desc: "Extended (2 clips)" },
  { value: "24", label: "24 seconds", desc: "Long (3 clips)" },
  { value: "32", label: "32 seconds", desc: "Full scene (4 clips)" },
];

const PROGRESS_PHASES = [
  { id: "planning", label: "AI Director Planning", icon: Clapperboard, desc: "Creating cinematic shot plan with clip details..." },
  { id: "keyframes", label: "Generating Keyframes", icon: ImageIcon, desc: "Creating AI keyframe images for each clip..." },
  { id: "video", label: "Rendering Video", icon: FileVideo, desc: "Stitching keyframes into MP4 with Ken Burns effects..." },
  { id: "audio", label: "Adding Voiceover", icon: Volume2, desc: "Overlaying voiceover narration onto video..." },
  { id: "upload", label: "Uploading", icon: Save, desc: "Uploading final video to cloud storage..." },
  { id: "complete", label: "Complete", icon: CheckCircle2, desc: "Video ready to play!" },
];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function GenerateVideo() {
  const { user } = useAuth();
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic-realism");
  const [duration, setDuration] = useState("8");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [expandedClips, setExpandedClips] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progressPhase, setProgressPhase] = useState(-1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: videos, isLoading } = trpc.video.list.useQuery();
  const generateMutation = trpc.video.generateVideo.useMutation();
  const saveMutation = trpc.video.saveSelectedGeneratedVideos.useMutation();
  const utils = trpc.useUtils();

  // Selected video details
  const selectedVideo = useMemo(() => {
    return (videos || []).find((v: any) => v.id === selectedVideoId);
  }, [videos, selectedVideoId]);

  // Videos with generated content
  const generatedVideos = useMemo(() => {
    return (videos || []).filter((v: any) => v.generatedVideoUrl || v.generatedVideoPrompt);
  }, [videos]);

  // Initialize saved selections from DB
  useEffect(() => {
    if (videos) {
      const saved = new Set<number>();
      const selected = new Set<number>();
      videos.forEach((v: any) => {
        if (v.generatedVideoSaved) {
          saved.add(v.id);
          selected.add(v.id);
        }
      });
      setSavedIds(saved);
      setSelectedIds(selected);
    }
  }, [videos]);

  // Elapsed time counter
  useEffect(() => {
    if (isGenerating) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  // Auto-advance progress phases based on elapsed time
  // This provides smooth visual feedback during the long API call
  useEffect(() => {
    if (!isGenerating) return;
    // Phase transitions based on typical timing:
    // 0-3s: Planning (LLM call starts)
    // 3-20s: Generating keyframes (image gen for each clip)
    // 20-60s: Rendering video (ffmpeg processing)
    // 60-80s: Adding voiceover / uploading
    if (elapsedSeconds >= 60 && progressPhase < 4) {
      setProgressPhase(4); // upload
    } else if (elapsedSeconds >= 40 && progressPhase < 3) {
      setProgressPhase(3); // audio overlay
    } else if (elapsedSeconds >= 20 && progressPhase < 2) {
      setProgressPhase(2); // rendering video
    } else if (elapsedSeconds >= 3 && progressPhase < 1) {
      setProgressPhase(1); // keyframes
    }
  }, [elapsedSeconds, isGenerating, progressPhase]);

  const hasUnsavedChanges = useMemo(() => {
    if (selectedIds.size !== savedIds.size) return true;
    for (const id of Array.from(selectedIds)) {
      if (!savedIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, savedIds]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(generatedVideos.map((v: any) => v.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleClipExpand = (clipNum: number) => {
    setExpandedClips(prev => {
      const next = new Set(prev);
      if (next.has(clipNum)) next.delete(clipNum);
      else next.add(clipNum);
      return next;
    });
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleGenerate = async () => {
    if (!selectedVideoId || !prompt.trim()) {
      toast.error("Please select a video and enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationResult(null);
    setProgressPhase(0); // Start at planning

    try {
      const result = await generateMutation.mutateAsync({
        videoId: selectedVideoId,
        prompt: prompt.trim(),
        style: VIDEO_STYLES.find(s => s.value === style)?.label || style,
        duration: parseInt(duration),
        aspectRatio,
      });

      // Jump to complete
      setProgressPhase(5); // Complete index
      setIsGenerating(false);
      setGenerationResult(result);
      utils.video.list.invalidate();

      if (result.videoUrl) {
        toast.success(result.hasVoiceover
          ? "Video generated with voiceover narration!"
          : "MP4 video generated successfully!");
      } else {
        toast.success("Video plan created with keyframes!");
      }
    } catch (err: any) {
      setProgressPhase(-1);
      setGenerationError(err.message || "Video generation failed");
      toast.error("Video generation failed. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ ids: Array.from(selectedIds) });
      setSavedIds(new Set(selectedIds));
      utils.video.list.invalidate();
      toast.success(`Saved ${selectedIds.size} generated video(s)`);
    } catch {
      toast.error("Failed to save selections");
    }
  };

  const totalPhases = PROGRESS_PHASES.length;
  const progressPercent = progressPhase < 0 ? 0 : Math.min(((progressPhase + 1) / totalPhases) * 100, 100);

  const isVideoUrl = (url: string) => {
    return url?.endsWith('.mp4') || url?.endsWith('.webm') || url?.endsWith('.mov');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            Generate Video
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered video generation — creates real MP4 videos with voiceover from AI keyframes
          </p>
        </div>
        <Badge variant="outline" className="border-purple-500/30 text-purple-400">
          <Film className="w-3 h-3 mr-1" />
          AI Video Pipeline
        </Badge>
      </div>

      {/* Generation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clapperboard className="w-5 h-5 text-purple-400" />
                Video Generation Studio
              </CardTitle>
              <CardDescription>
                Select a video project and describe the video you want to generate. If the video has a voiceover, it will be automatically overlaid onto the final MP4.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Video Project</label>
                <Select
                  value={selectedVideoId?.toString() || ""}
                  onValueChange={(v) => setSelectedVideoId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a video project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(videos || []).map((v: any) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.title} — {v.status}
                        {v.voiceoverUrl ? " 🎙️" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Voiceover indicator */}
                {selectedVideo && (
                  <div className="flex items-center gap-2 text-xs">
                    {selectedVideo.voiceoverUrl ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <Volume2 className="w-3 h-3" />
                        Voiceover available — will be included in the video
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <VolumeX className="w-3 h-3" />
                        No voiceover — generate one in the Voiceover page first for narrated video
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Video Prompt</label>
                <Textarea
                  placeholder="Describe the video you want to generate in detail. Include scene description, mood, actions, camera movements, and any specific visual elements..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Be specific about camera movements, lighting, and scene transitions for better results.
                </p>
              </div>

              {/* Options Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Style</label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_STYLES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aspect Ratio</label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Shorts)</SelectItem>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedVideoId || !prompt.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 text-base"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Video... ({formatElapsed(elapsedSeconds)})
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate MP4 Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Progress Tracker */}
          {(isGenerating || progressPhase >= 0) && progressPhase < totalPhases && (
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    Generation Progress
                    {isGenerating && (
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatElapsed(elapsedSeconds)}
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {progressPhase >= totalPhases - 1
                      ? "Complete!"
                      : `Step ${Math.min(progressPhase + 1, totalPhases)} of ${totalPhases}`}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />

                {isGenerating && (
                  <p className="text-xs text-muted-foreground text-center">
                    Video generation typically takes 60-120 seconds depending on the number of clips and complexity.
                  </p>
                )}

                <div className="space-y-3 mt-4">
                  {PROGRESS_PHASES.map((phase, idx) => {
                    const PhaseIcon = phase.icon;
                    const isComplete = progressPhase > idx;
                    const isActive = progressPhase === idx && isGenerating;
                    const isDone = progressPhase === idx && !isGenerating && progressPhase === totalPhases - 1;

                    return (
                      <motion.div
                        key={phase.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isActive ? "bg-purple-500/10 border border-purple-500/30" :
                          isComplete || isDone ? "bg-green-500/5 border border-green-500/20" :
                          "opacity-40"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isComplete || isDone ? "bg-green-500/20 text-green-400" :
                          isActive ? "bg-purple-500/20 text-purple-400" :
                          "bg-muted/30 text-muted-foreground"
                        }`}>
                          {isComplete || isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <PhaseIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            isComplete || isDone ? "text-green-400" :
                            isActive ? "text-purple-400" : ""
                          }`}>
                            {phase.label}
                            {(isComplete || isDone) && " ✓"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isComplete || isDone ? "Done" : isActive ? phase.desc : "Waiting..."}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {generationError && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">Generation Failed</p>
                    <p className="text-xs text-muted-foreground mt-1">{generationError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={handleGenerate}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generation Result */}
          <AnimatePresence>
            {generationResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Video Player */}
                {generationResult.videoUrl && isVideoUrl(generationResult.videoUrl) && (
                  <Card className="border-green-500/30 bg-card/50 backdrop-blur overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileVideo className="w-5 h-5 text-green-400" />
                        Generated MP4 Video
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                          MP4
                        </Badge>
                        {generationResult.hasVoiceover && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                            <Volume2 className="w-2.5 h-2.5 mr-0.5" />
                            With Voiceover
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg overflow-hidden border border-border/50 bg-black">
                        <video
                          ref={videoRef}
                          src={generationResult.videoUrl}
                          controls
                          className="w-full h-auto max-h-[500px]"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onEnded={() => setIsPlaying(false)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleVideoPlay}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          {isPlaying ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                          {isPlaying ? "Pause" : "Play"}
                        </Button>
                        <a
                          href={generationResult.videoUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download MP4
                          </Button>
                        </a>
                      </div>
                      {generationResult.hasVoiceover && (
                        <p className="text-xs text-green-400/80 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          This video includes your voiceover narration. Make sure to unmute the player to hear it.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Keyframe Gallery */}
                {generationResult.keyframeUrls && generationResult.keyframeUrls.length > 0 && (
                  <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                        Generated Keyframes ({generationResult.keyframeUrls.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {generationResult.keyframeUrls.map((url: string, idx: number) => (
                          <div key={idx} className="rounded-lg overflow-hidden border border-border/50 relative group">
                            <img
                              src={url}
                              alt={`Keyframe ${idx + 1}`}
                              className="w-full h-auto object-cover aspect-video"
                            />
                            <div className="absolute bottom-1 left-1">
                              <Badge className="bg-black/60 text-white text-[10px]">
                                Clip {idx + 1}
                              </Badge>
                            </div>
                            <a
                              href={url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Button variant="ghost" size="icon" className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white">
                                <Download className="w-3 h-3" />
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fallback: Single keyframe image (no video) */}
                {generationResult.keyframeUrl && !generationResult.videoUrl && (!generationResult.keyframeUrls || generationResult.keyframeUrls.length === 0) && (
                  <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                        Generated Keyframe
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg overflow-hidden border border-border/50">
                        <img
                          src={generationResult.keyframeUrl}
                          alt="Generated keyframe"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Video Prompt */}
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Video className="w-5 h-5 text-purple-400" />
                      Video Production Prompt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed">
                      {generationResult.videoPrompt}
                    </div>
                  </CardContent>
                </Card>

                {/* Clip Plan */}
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Film className="w-5 h-5 text-purple-400" />
                      Clip Plan ({generationResult.clipPlan?.length || 0} clips)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(generationResult.clipPlan || []).map((clip: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-border/50 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleClipExpand(clip.clipNumber)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                              {clip.clipNumber}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{clip.narrativePurpose}</p>
                              <p className="text-xs text-muted-foreground">{clip.duration}s — {clip.cameraMovement}</p>
                            </div>
                          </div>
                          {expandedClips.has(clip.clipNumber) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedClips.has(clip.clipNumber) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 pt-0 space-y-2 text-sm">
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Scene:</span>
                                  <p className="text-muted-foreground">{clip.sceneDescription}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Transition:</span>
                                  <p className="text-muted-foreground">{clip.transitionDescription}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Style & Audio Notes */}
                {(generationResult.styleNotes || generationResult.audioNotes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generationResult.styleNotes && (
                      <Card className="border-border/50 bg-card/50 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Camera className="w-4 h-4 text-purple-400" />
                            Style Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground leading-relaxed">{generationResult.styleNotes}</p>
                        </CardContent>
                      </Card>
                    )}
                    {generationResult.audioNotes && (
                      <Card className="border-border/50 bg-card/50 backdrop-blur">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-purple-400" />
                            Audio Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground leading-relaxed">{generationResult.audioNotes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar: Style Guide */}
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Style Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {VIDEO_STYLES.map(s => (
                <div
                  key={s.value}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    style === s.value
                      ? "bg-purple-500/10 border border-purple-500/30"
                      : "hover:bg-muted/30 border border-transparent"
                  }`}
                  onClick={() => setStyle(s.value)}
                >
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generated Videos Gallery */}
      {generatedVideos.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Generated Videos</h2>
                <p className="text-sm text-muted-foreground">
                  {generatedVideos.length} video(s) generated — select to save
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                  {selectedIds.size} selected
                </Badge>
                <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedVideos.map((v: any) => (
                <Card
                  key={v.id}
                  className={`border-border/50 bg-card/50 backdrop-blur cursor-pointer transition-all hover:border-purple-500/30 ${
                    selectedIds.has(v.id) ? "ring-2 ring-purple-500/50 border-purple-500/30" : ""
                  }`}
                  onClick={() => toggleSelect(v.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(v.id)}
                          onCheckedChange={() => toggleSelect(v.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{v.title}</p>
                          <p className="text-xs text-muted-foreground">{v.generatedVideoStyle || "Cinematic"}</p>
                        </div>
                      </div>
                      {v.generatedVideoSaved && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                          Saved
                        </Badge>
                      )}
                    </div>

                    {v.generatedVideoUrl && isVideoUrl(v.generatedVideoUrl) ? (
                      <div className="rounded-lg overflow-hidden border border-border/50 bg-black">
                        <video
                          src={v.generatedVideoUrl}
                          className="w-full h-auto aspect-video object-cover"
                          muted
                          preload="metadata"
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                        />
                      </div>
                    ) : v.generatedVideoUrl ? (
                      <div className="rounded-lg overflow-hidden border border-border/50">
                        <img
                          src={v.generatedVideoUrl}
                          alt={v.title}
                          className="w-full h-auto aspect-video object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/50 bg-muted/20 aspect-video flex items-center justify-center">
                        <FileVideo className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {v.voiceoverUrl && (
                        <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                          <Volume2 className="w-2.5 h-2.5 mr-0.5" />
                          Voiceover
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {v.generatedVideoDuration || 8}s
                      </Badge>
                    </div>

                    {v.generatedVideoUrl && (
                      <a
                        href={v.generatedVideoUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Floating Save Bar */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-4 bg-card/95 backdrop-blur-lg border border-purple-500/30 rounded-full px-6 py-3 shadow-2xl shadow-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-sm font-medium">
                  {selectedIds.size} video(s) selected
                </span>
              </div>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full px-6"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
