import { useState, useMemo, useEffect, useCallback } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Zap, ListTodo, ShieldAlert, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { SkeletonList } from "@/shared/components/common/SkeletonList";

type ViewMode = "month" | "week";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: "sprint" | "task" | "impediment" | "custom";
  color: string;
  meta?: string;
  time?: string;
  isCustom?: boolean;
}

interface CalendarEventRecord {
  id: string;
  team_id: string;
  user_id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  event_type: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  general: "bg-accent/15 text-accent border-accent/20",
  meeting: "bg-primary/15 text-primary border-primary/20",
  deadline: "bg-destructive/15 text-destructive border-destructive/20",
  milestone: "bg-success/15 text-success border-success/20",
  other: "bg-muted text-muted-foreground border-muted-foreground/20",
};

const EVENT_TYPES = [
  { value: "general", label: "Geral" },
  { value: "meeting", label: "Reunião" },
  { value: "deadline", label: "Deadline" },
  { value: "milestone", label: "Marco" },
  { value: "other", label: "Outro" },
];

export function CalendarView() {
  const { activeSprint, sprints, activities, userStories, impediments, developers, loading: sprintLoading } = useSprint();
  const { currentTeamId, user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState("all");

  // Custom events CRUD
  const [customEvents, setCustomEvents] = useState<CalendarEventRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [evTitle, setEvTitle] = useState("");
  const [evDescription, setEvDescription] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evTime, setEvTime] = useState("");
  const [evType, setEvType] = useState("general");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchCustomEvents = useCallback(async () => {
    if (!currentTeamId) return;
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("team_id", currentTeamId);
      if (error) throw error;
      setCustomEvents((data || []) as CalendarEventRecord[]);
    } catch {
      toast.error("Erro ao carregar eventos");
    } finally {
      setLoadingEvents(false);
    }
  }, [currentTeamId]);

  useEffect(() => { fetchCustomEvents(); }, [fetchCustomEvents]);

  const resetForm = () => {
    setEvTitle(""); setEvDescription(""); setEvDate(""); setEvTime(""); setEvType("general");
    setErrors({}); setEditingEvent(null);
  };

  const openCreateForDate = (dateStr: string) => {
    resetForm();
    setEvDate(dateStr);
    setEventDialogOpen(true);
  };

  const openEditEvent = (evt: CalendarEventRecord) => {
    setEditingEvent(evt);
    setEvTitle(evt.title);
    setEvDescription(evt.description || "");
    setEvDate(evt.event_date);
    setEvTime(evt.event_time || "");
    setEvType(evt.event_type);
    setErrors({});
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    const e: Record<string, string> = {};
    if (!evTitle.trim()) e.title = "Título é obrigatório";
    if (!evDate) e.date = "Data é obrigatória";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      if (editingEvent) {
        const { error } = await supabase.from("calendar_events").update({
          title: evTitle.trim(),
          description: evDescription.trim(),
          event_date: evDate,
          event_time: evTime || null,
          event_type: evType,
        }).eq("id", editingEvent.id);
        if (error) throw error;
        toast.success("Alterações salvas com sucesso");
      } else {
        const { error } = await supabase.from("calendar_events").insert({
          team_id: currentTeamId!,
          user_id: user!.id,
          title: evTitle.trim(),
          description: evDescription.trim(),
          event_date: evDate,
          event_time: evTime || null,
          event_type: evType,
        });
        if (error) throw error;
        toast.success("Registro criado com sucesso");
      }
      resetForm();
      setEventDialogOpen(false);
      await fetchCustomEvents();
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("calendar_events").delete().eq("id", deleteTarget);
      if (error) throw error;
      toast.success("Registro excluído com sucesso");
      await fetchCustomEvents();
    } catch {
      toast.error("Falha ao excluir item");
    }
    setDeleteTarget(null);
  };

  // Generate events from data
  const events = useMemo(() => {
    const evts: CalendarEvent[] = [];

    // Sprint events
    sprints.forEach((s) => {
      evts.push({ id: `sprint-start-${s.id}`, title: `🚀 ${s.name} (início)`, date: s.startDate, type: "sprint", color: "bg-primary/15 text-primary border-primary/20" });
      evts.push({ id: `sprint-end-${s.id}`, title: `🏁 ${s.name} (fim)`, date: s.endDate, type: "sprint", color: "bg-primary/15 text-primary border-primary/20" });
    });

    // Task events
    activities.forEach((act) => {
      const hu = userStories.find((h) => h.id === act.huId);
      const dev = developers.find((d) => d.id === act.assigneeId);
      evts.push({
        id: `task-${act.id}`, title: act.title, date: act.endDate, type: "task",
        color: act.isClosed ? "bg-success/10 text-success border-success/20" : "bg-info/10 text-info border-info/20",
        meta: `${hu?.code || ""} • ${dev?.name || ""}`,
      });
    });

    // Impediment events
    impediments.filter((i) => !i.resolvedAt).forEach((imp) => {
      evts.push({
        id: `imp-${imp.id}`, title: imp.reason, date: imp.reportedAt.split("T")[0],
        type: "impediment", color: "bg-warning/10 text-warning border-warning/20",
      });
    });

    // Custom events
    customEvents.forEach((ce) => {
      evts.push({
        id: `custom-${ce.id}`, title: ce.title, date: ce.event_date,
        type: "custom", color: EVENT_TYPE_COLORS[ce.event_type] || EVENT_TYPE_COLORS.general,
        time: ce.event_time || undefined, isCustom: true, meta: ce.description || undefined,
      });
    });

    if (typeFilter !== "all") return evts.filter((e) => e.type === typeFilter);
    return evts;
  }, [sprints, activities, userStories, impediments, developers, customEvents, typeFilter]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const monthLabel = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startOffset = firstDay.getDay();
      const days: { date: Date; isCurrentMonth: boolean }[] = [];
      for (let i = startOffset - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
      for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      return days;
    } else {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      const days: { date: Date; isCurrentMonth: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        days.push({ date: d, isCurrentMonth: d.getMonth() === month });
      }
      return days;
    }
  }, [year, month, currentDate, viewMode]);

  const today = new Date().toISOString().split("T")[0];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const dayEvts = events.filter((e) => e.date === dateStr);
    // Sort by time if available
    return dayEvts.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  };

  const handleEventClick = (evt: CalendarEvent) => {
    if (!evt.isCustom) return;
    const customId = evt.id.replace("custom-", "");
    const record = customEvents.find((ce) => ce.id === customId);
    if (record) openEditEvent(record);
  };

  if (sprintLoading || loadingEvents) return <SkeletonList count={6} variant="row" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Calendário</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => openCreateForDate(today)}>
            <Plus className="h-4 w-4" /> Novo Evento
          </Button>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sprint">Sprints</SelectItem>
              <SelectItem value="task">Tarefas</SelectItem>
              <SelectItem value="impediment">Impedimentos</SelectItem>
              <SelectItem value="custom">Eventos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dateStr = day.date.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const dayEvents = getEventsForDate(day.date);
              return (
                <div
                  key={i}
                  className={`border-b border-r p-1.5 cursor-pointer hover:bg-muted/20 transition-colors ${viewMode === "week" ? "min-h-[200px]" : "min-h-[90px]"} ${
                    !day.isCurrentMonth ? "bg-muted/30" : ""
                  } ${isToday ? "bg-primary/5" : ""}`}
                  onClick={() => openCreateForDate(dateStr)}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday ? "text-primary font-bold" : !day.isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"
                  }`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, viewMode === "week" ? 10 : 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={`text-[9px] leading-tight px-1 py-0.5 rounded border truncate ${evt.color} ${evt.isCustom ? "cursor-pointer hover:opacity-80" : ""}`}
                        title={evt.title + (evt.time ? ` (${evt.time})` : "")}
                        onClick={(e) => { e.stopPropagation(); handleEventClick(evt); }}
                      >
                        {evt.time ? `${evt.time} ` : ""}{evt.title}
                      </div>
                    ))}
                    {dayEvents.length > (viewMode === "week" ? 10 : 3) && (
                      <span className="text-[9px] text-muted-foreground">+{dayEvents.length - (viewMode === "week" ? 10 : 3)} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Sprint</span>
        <span className="flex items-center gap-1"><ListTodo className="h-3 w-3 text-info" /> Tarefa</span>
        <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-warning" /> Impedimento</span>
        <span className="flex items-center gap-1"><CalIcon className="h-3 w-3 text-accent" /> Evento</span>
      </div>

      {/* Event Create/Edit Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setEventDialogOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalIcon className="h-5 w-5 text-primary" />
              {editingEvent ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título <span className="text-destructive">*</span></Label>
              <Input value={evTitle} onChange={(e) => { setEvTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }} placeholder="Título do evento" className="mt-1" />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data <span className="text-destructive">*</span></Label>
                <Input type="date" value={evDate} onChange={(e) => { setEvDate(e.target.value); setErrors((p) => ({ ...p, date: "" })); }} className="mt-1" />
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
              </div>
              <div>
                <Label>Horário (opcional)</Label>
                <Input type="time" value={evTime} onChange={(e) => setEvTime(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={evType} onValueChange={setEvType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={evDescription} onChange={(e) => setEvDescription(e.target.value)} placeholder="Detalhes do evento..." className="mt-1" rows={3} />
            </div>
            <div className="flex gap-2">
              {editingEvent && (
                <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => { setDeleteTarget(editingEvent.id); setEventDialogOpen(false); }}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              )}
              <Button className="flex-1 gap-1.5" onClick={handleSaveEvent} disabled={submitting}>
                {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" /> : editingEvent ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingEvent ? "Salvar Alterações" : "Criar Evento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
    </div>
  );
}
