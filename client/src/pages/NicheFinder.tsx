import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Compass, Sparkles, Trash2, Star, Loader2, TrendingUp, Target, Zap, Save, CheckCircle2, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  "storytelling", "finance", "tech", "health", "education",
  "business", "self-improvement", "legal", "travel", "gaming"
];

const COMPETITION_COLORS: Record<string, string> = {
  low: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function NicheFinder() {
  const [category, setCategory] = useState<string>("");
  const [customNiche, setCustomNiche] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const utils = trpc.useUtils();

  const { data: niches, isLoading } = trpc.niche.list.useQuery();

  // Initialize selectedIds from existing saved selections
  useEffect(() => {
    if (niches) {
      const saved = new Set(niches.filter(n => n.isSelected).map(n => n.id));
      setSelectedIds(saved);
      setHasUnsavedChanges(false);
    }
  }, [niches]);

  const discoverMutation = trpc.niche.discover.useMutation({
    onSuccess: (data) => {
      utils.niche.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`Discovered ${data.count} profitable niches!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = trpc.niche.saveSelected.useMutation({
    onSuccess: (data) => {
      setHasUnsavedChanges(false);
      utils.niche.list.invalidate();
      utils.audit.list.invalidate();
      toast.success(`Saved ${data.count} selected niche(s)!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.niche.delete.useMutation({
    onSuccess: () => {
      utils.niche.list.invalidate();
      toast.success("Niche removed");
    },
  });

  const handleDiscover = () => {
    discoverMutation.mutate({
      category: category || undefined,
      customNiche: customNiche || undefined,
    });
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

  const selectAll = () => {
    if (!niches) return;
    setSelectedIds(new Set(niches.map(n => n.id)));
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
  const totalCount = niches?.length ?? 0;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Niche Finder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discover profitable YouTube niches with AI-powered analysis of CPM rates, competition, and trends
          </p>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {selectedCount}/{totalCount} selected
            </Badge>
          </div>
        )}
      </div>

      {/* Discovery Controls */}
      <Card className="glass-card glow-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Custom Niche (optional)</label>
              <Input
                placeholder="Enter a niche idea to analyze..."
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleDiscover} disabled={discoverMutation.isPending} className="w-full md:w-auto">
                {discoverMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Discover Niches</>
                )}
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
              {selectedCount} niche{selectedCount !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : niches && niches.length > 0 ? (
        <div className="grid gap-4">
          {niches.map((niche) => {
            const isChecked = selectedIds.has(niche.id);
            return (
              <Card
                key={niche.id}
                className={`glass-card transition-all cursor-pointer ${
                  isChecked
                    ? 'border-primary/50 glow-border bg-primary/[0.02]'
                    : 'hover:border-primary/20'
                }`}
                onClick={() => toggleSelect(niche.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="pt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleSelect(niche.id)}
                        className="h-5 w-5"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{niche.name}</h3>
                            {isChecked && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline" className="capitalize text-xs">{niche.category}</Badge>
                            {niche.subNiche && <Badge variant="secondary" className="text-xs">{niche.subNiche}</Badge>}
                            <Badge variant="outline" className={`text-xs capitalize ${COMPETITION_COLORS[niche.competitionLevel || ''] || ''}`}>
                              {niche.competitionLevel} competition
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{niche.rationale}</p>
                          <div className="flex flex-wrap gap-1">
                            {(niche.keywords as string[] || []).slice(0, 6).map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] bg-primary/5">{kw}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-3 shrink-0">
                          <div className="text-center px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/10">
                            <p className="text-lg font-bold text-green-400">${niche.cpmMin}-${niche.cpmMax}</p>
                            <p className="text-[10px] text-muted-foreground">CPM Range</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <TrendingUp className="h-3 w-3 text-blue-400" />
                                <span className="text-sm font-semibold">{niche.trendScore}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Trend</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Target className="h-3 w-3 text-purple-400" />
                                <span className="text-sm font-semibold">{niche.profitabilityScore}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Profit</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Zap className="h-3 w-3 text-yellow-400" />
                                <span className="text-sm font-semibold">{niche.automationScore}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Auto</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: niche.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <Compass className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-semibold mb-1">No niches discovered yet</h3>
            <p className="text-sm text-muted-foreground">Use the AI to find profitable YouTube niches above</p>
          </CardContent>
        </Card>
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
                    {selectedCount} niche{selectedCount !== 1 ? 's' : ''} selected
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
