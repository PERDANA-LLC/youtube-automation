import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Plus, Loader2, TrendingUp, CreditCard, Link2, Handshake, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SOURCE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  adsense: { icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
  affiliate: { icon: Link2, color: "text-blue-400", bg: "bg-blue-500/10" },
  sponsorship: { icon: Handshake, color: "text-purple-400", bg: "bg-purple-500/10" },
  merchandise: { icon: ShoppingBag, color: "text-orange-400", bg: "bg-orange-500/10" },
  other: { icon: CreditCard, color: "text-gray-400", bg: "bg-gray-500/10" },
};

export default function Revenue() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ source: "adsense" as "adsense" | "affiliate" | "sponsorship" | "merchandise" | "other", amount: 0, description: "", date: "" });
  const utils = trpc.useUtils();

  const { data: revenueSummary, isLoading: summaryLoading } = trpc.revenue.summary.useQuery();
  const { data: entries, isLoading: entriesLoading } = trpc.revenue.list.useQuery();

  const addMutation = trpc.revenue.add.useMutation({
    onSuccess: () => {
      utils.revenue.summary.invalidate();
      utils.revenue.list.invalidate();
      utils.audit.list.invalidate();
      setDialogOpen(false);
      toast.success("Revenue entry added!");
    },
    onError: (err) => toast.error(err.message),
  });

  const summaryCards = [
    { label: "Total Revenue", value: revenueSummary ? Number(revenueSummary.totalRevenue) : 0, icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "AdSense", value: revenueSummary ? Number(revenueSummary.adsenseRevenue) : 0, icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Affiliate", value: revenueSummary ? Number(revenueSummary.affiliateRevenue) : 0, icon: Link2, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Sponsorship", value: revenueSummary ? Number(revenueSummary.sponsorshipRevenue) : 0, icon: Handshake, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor AdSense, affiliate, and sponsorship earnings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Revenue</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Revenue Entry</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Source</label>
                <Select value={form.source} onValueChange={(v) => setForm(p => ({ ...p, source: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adsense">AdSense</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="sponsorship">Sponsorship</SelectItem>
                    <SelectItem value="merchandise">Merchandise</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Amount ($)</label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Notes..." />
              </div>
              <Button className="w-full" onClick={() => addMutation.mutate({ ...form, date: new Date(form.date) })} disabled={!form.date || form.amount <= 0 || addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Revenue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {summaryLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">${card.value.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Revenue History</CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : entries && entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map((entry) => {
                const config = SOURCE_CONFIG[entry.source] || SOURCE_CONFIG.other;
                const Icon = config.icon;
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{entry.source}</Badge>
                        {entry.description && <p className="text-xs text-muted-foreground truncate">{entry.description}</p>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(entry.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-bold text-green-400 shrink-0">${entry.amount.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No revenue entries yet. Start tracking your earnings!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
