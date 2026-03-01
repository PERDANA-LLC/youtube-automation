import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, Loader2, CheckCircle2, Clock, Upload, Target, Eye, Award } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const EVENT_COLORS: Record<string, string> = {
  upload: "bg-green-500/10 text-green-400 border-green-500/20",
  deadline: "bg-red-500/10 text-red-400 border-red-500/20",
  review: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  milestone: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};
const EVENT_ICONS: Record<string, any> = {
  upload: Upload, deadline: Clock, review: Eye, milestone: Award,
};

export default function ContentCalendar() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<"upload" | "deadline" | "review" | "milestone">("upload");
  const [scheduledDate, setScheduledDate] = useState("");
  const utils = trpc.useUtils();

  const { data: events, isLoading } = trpc.calendar.list.useQuery();

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate();
      utils.audit.list.invalidate();
      setTitle(""); setScheduledDate(""); setDialogOpen(false);
      toast.success("Event created!");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Event deleted"); },
  });
  const completeMutation = trpc.calendar.update.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("Event completed!"); },
  });

  const groupedEvents = useMemo(() => {
    if (!events) return {};
    const groups: Record<string, typeof events> = {};
    events.forEach(e => {
      const dateKey = new Date(e.scheduledAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [events]);

  const upcomingCount = events?.filter(e => !e.isCompleted && new Date(e.scheduledAt) >= new Date()).length ?? 0;
  const completedCount = events?.filter(e => e.isCompleted).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule uploads, deadlines, and milestones</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Calendar Event</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input placeholder="Event title..." value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Type</label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date & Time</label>
                <Input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate({ title, eventType, scheduledAt: new Date(scheduledDate) })} disabled={!title || !scheduledDate || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{events?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{upcomingCount}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : events && events.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{date}</h3>
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const Icon = EVENT_ICONS[event.eventType] || Calendar;
                  return (
                    <Card key={event.id} className={`glass-card transition-all ${event.isCompleted ? 'opacity-50' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${EVENT_COLORS[event.eventType]?.split(' ')[0] || 'bg-secondary'}`}>
                            <Icon className={`h-4 w-4 ${EVENT_COLORS[event.eventType]?.split(' ')[1] || ''}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${event.isCompleted ? 'line-through' : ''}`}>{event.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] capitalize ${EVENT_COLORS[event.eventType] || ''}`}>{event.eventType}</Badge>
                              <span className="text-[10px] text-muted-foreground">{new Date(event.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {!event.isCompleted && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => completeMutation.mutate({ id: event.id, isCompleted: true })}>
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteMutation.mutate({ id: event.id })}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="glass-card"><CardContent className="py-16 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-1">No events scheduled</h3>
          <p className="text-sm text-muted-foreground">Create your first calendar event to plan your content</p>
        </CardContent></Card>
      )}
    </div>
  );
}
