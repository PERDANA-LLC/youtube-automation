import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart3, Eye, ThumbsUp, MessageSquare, Clock, Users, DollarSign, TrendingUp, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Analytics() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: "", views: 0, likes: 0, comments: 0, shares: 0, watchTimeMinutes: 0, avgRetentionPercent: 0, cpm: 0, estimatedRevenue: 0, subscribers: 0 });
  const utils = trpc.useUtils();

  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: entries, isLoading: entriesLoading } = trpc.analytics.list.useQuery();

  const addMutation = trpc.analytics.add.useMutation({
    onSuccess: () => {
      utils.analytics.summary.invalidate();
      utils.analytics.list.invalidate();
      setDialogOpen(false);
      toast.success("Analytics data added!");
    },
    onError: (err) => toast.error(err.message),
  });

  const stats = [
    { icon: Eye, label: "Total Views", value: summary ? Number(summary.totalViews).toLocaleString() : "0", color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: ThumbsUp, label: "Total Likes", value: summary ? Number(summary.totalLikes).toLocaleString() : "0", color: "text-green-400", bg: "bg-green-500/10" },
    { icon: MessageSquare, label: "Comments", value: summary ? Number(summary.totalComments).toLocaleString() : "0", color: "text-purple-400", bg: "bg-purple-500/10" },
    { icon: Users, label: "Subscribers", value: summary ? Number(summary.totalSubscribers).toLocaleString() : "0", color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { icon: Clock, label: "Avg Retention", value: summary ? `${Number(summary.avgRetention).toFixed(1)}%` : "0%", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: DollarSign, label: "Avg CPM", value: summary ? `$${Number(summary.avgCpm).toFixed(2)}` : "$0", color: "text-orange-400", bg: "bg-orange-500/10" },
    { icon: TrendingUp, label: "Est. Revenue", value: summary ? `$${Number(summary.totalRevenue).toFixed(0)}` : "$0", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Track video performance, CPM rates, and audience metrics</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Data</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Analytics Data</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <label className="text-xs font-medium mb-1 block">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              {[
                { key: "views", label: "Views" }, { key: "likes", label: "Likes" },
                { key: "comments", label: "Comments" }, { key: "shares", label: "Shares" },
                { key: "watchTimeMinutes", label: "Watch Time (min)" }, { key: "avgRetentionPercent", label: "Avg Retention %" },
                { key: "cpm", label: "CPM ($)" }, { key: "estimatedRevenue", label: "Est. Revenue ($)" },
                { key: "subscribers", label: "Subscribers" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-medium mb-1 block">{label}</label>
                  <Input type="number" value={(form as any)[key]} onChange={(e) => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} />
                </div>
              ))}
              <div className="col-span-2">
                <Button className="w-full" onClick={() => addMutation.mutate({ ...form, date: new Date(form.date) })} disabled={!form.date || addMutation.isPending}>
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Analytics
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      {summaryLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Data Table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Analytics History</CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : entries && entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Views</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Likes</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Subs</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">CPM</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="py-2 px-2 text-xs">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="py-2 px-2 text-xs text-right">{e.views?.toLocaleString()}</td>
                      <td className="py-2 px-2 text-xs text-right">{e.likes?.toLocaleString()}</td>
                      <td className="py-2 px-2 text-xs text-right">{e.subscribers?.toLocaleString()}</td>
                      <td className="py-2 px-2 text-xs text-right">${e.cpm?.toFixed(2)}</td>
                      <td className="py-2 px-2 text-xs text-right font-medium">${e.estimatedRevenue?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No analytics data yet. Add your first entry above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
