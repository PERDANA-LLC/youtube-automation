import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Sparkles, Trash2, Loader2, Flame, CheckCircle2, X, Save, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const SOURCE_COLORS: Record<string, string> = {
  trending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  reddit: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  news: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  evergreen: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function ContentResearch() {
  const [niche, setNiche] = useState("");
  const [count, setCount] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const utils = trpc.useUtils();

  const { data: ideas, isLoading } = trpc.research.list.useQuery();

  // Initialize selectedIds from existing saved selections
  useEffect(() => {
    if (ideas) {
      const saved = new Set(ideas.filter(i => i.isSelected).map(i => i.id));
      setSelectedIds(saved);
      setHasUnsavedChanges(false);
    }
  }, [ideas]);

  const generateMutation = trpc.research.generate.useMutation({
    onSuccess: (data) => {
      utils.research.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`Generated ${data.count} content ideas!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = trpc.research.saveSelected.useMutation({
    onSuccess: (data) => {
      setHasUnsavedChanges(false);
      utils.research.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`Saved ${data.count} selected idea(s)!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.research.delete.useMutation({
    onSuccess: () => {
      utils.research.list.invalidate();
      toast.success("Idea removed");
    },
  });

  const markUsedMutation = trpc.research.markUsed.useMutation({
    onSuccess: () => {
      utils.research.list.invalidate();
      toast.success("Marked as used");
    },
  });

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
    if (!ideas) return;
    setSelectedIds(new Set(ideas.map(i => i.id)));
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
  const totalCount = ideas?.length ?? 0;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Research</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered research engine that finds viral video ideas from trending topics, Reddit, and news
          </p>
        </div>
        {totalCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {selectedCount}/{totalCount} selected
          </Badge>
        )}
      </div>

      {/* Generation Controls */}
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

      {/* Selection Controls */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={allSelected ? deselectAll : selectAll} className="text-xs">
            {allSelected ? (
              <><X className="h-3 w-3 mr-1.5" /> Deselect All</>
            ) : (
              <><CheckCircle2 className="h-3 w-3 mr-1.5" /> Select All</>
            )}
          </Button>
          {selectedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedCount} idea{selectedCount !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : ideas && ideas.length > 0 ? (
        <div className="grid gap-3">
          {ideas.map((idea) => {
            const isChecked = selectedIds.has(idea.id);
            return (
              <Card
                key={idea.id}
                className={`glass-card transition-all cursor-pointer ${
                  isChecked
                    ? 'border-primary/50 glow-border bg-primary/[0.02]'
                    : 'hover:border-primary/20'
                } ${idea.isUsed ? 'opacity-60' : ''}`}
                onClick={() => toggleSelect(idea.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleSelect(idea.id)}
                        className="h-5 w-5"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-sm">{idea.title}</h3>
                        {isChecked && <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />}
                        {idea.isUsed && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
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

                    {/* Action buttons */}
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!idea.isUsed && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markUsedMutation.mutate({ id: idea.id })}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Use
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate({ id: idea.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card"><CardContent className="py-16 text-center">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-1">No content ideas yet</h3>
          <p className="text-sm text-muted-foreground">Enter a niche above and let AI find viral video ideas</p>
        </CardContent></Card>
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
                    {selectedCount} idea{selectedCount !== 1 ? 's' : ''} selected
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
