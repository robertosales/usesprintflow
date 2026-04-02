import { useState, useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Zap, ListTodo, ShieldAlert } from "lucide-react";

type ViewMode = "month" | "week";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: "sprint" | "task" | "impediment";
  color: string;
  meta?: string;
}

export function CalendarView() {
  const { activeSprint, sprints, activities, userStories, impediments, developers } = useSprint();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState("all");

  // Generate events from data
  const events = useMemo(() => {
    const evts: CalendarEvent[] = [];

    // Sprint events
    sprints.forEach((s) => {
      evts.push({
        id: `sprint-start-${s.id}`,
        title: `🚀 ${s.name} (início)`,
        date: s.startDate,
        type: "sprint",
        color: "bg-primary/15 text-primary border-primary/20",
      });
      evts.push({
        id: `sprint-end-${s.id}`,
        title: `🏁 ${s.name} (fim)`,
        date: s.endDate,
        type: "sprint",
        color: "bg-primary/15 text-primary border-primary/20",
      });
    });

    // Task events (by end date)
    activities.forEach((act) => {
      const hu = userStories.find((h) => h.id === act.huId);
      const dev = developers.find((d) => d.id === act.assigneeId);
      evts.push({
        id: `task-${act.id}`,
        title: act.title,
        date: act.endDate,
        type: "task",
        color: act.isClosed
          ? "bg-success/10 text-success border-success/20"
          : "bg-info/10 text-info border-info/20",
        meta: `${hu?.code || ""} • ${dev?.name || ""}`,
      });
    });

    // Impediment events
    impediments.filter((i) => !i.resolvedAt).forEach((imp) => {
      evts.push({
        id: `imp-${imp.id}`,
        title: imp.reason,
        date: imp.reportedAt.split("T")[0],
        type: "impediment",
        color: "bg-warning/10 text-warning border-warning/20",
      });
    });

    if (typeFilter !== "all") {
      return evts.filter((e) => e.type === typeFilter);
    }
    return evts;
  }, [sprints, activities, userStories, impediments, developers, typeFilter]);

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + dir);
    } else {
      d.setDate(d.getDate() + dir * 7);
    }
    setCurrentDate(d);
  };

  const monthLabel = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Get days for calendar grid
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startOffset = firstDay.getDay(); // 0=Sun
      const days: { date: Date; isCurrentMonth: boolean }[] = [];

      // Previous month padding
      for (let i = startOffset - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        days.push({ date: d, isCurrentMonth: false });
      }
      // Current month
      for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true });
      }
      // Next month padding
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
      return days;
    } else {
      // Week view
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
    return events.filter((e) => e.date === dateStr);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Calendário</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sprint">Sprints</SelectItem>
              <SelectItem value="task">Tarefas</SelectItem>
              <SelectItem value="impediment">Impedimentos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
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
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>
          {/* Days */}
          <div className={`grid grid-cols-7 ${viewMode === "week" ? "" : ""}`}>
            {calendarDays.map((day, i) => {
              const dateStr = day.date.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const dayEvents = getEventsForDate(day.date);
              return (
                <div
                  key={i}
                  className={`border-b border-r p-1.5 ${viewMode === "week" ? "min-h-[200px]" : "min-h-[90px]"} ${
                    !day.isCurrentMonth ? "bg-muted/30" : ""
                  } ${isToday ? "bg-primary/5" : ""}`}
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
                        className={`text-[9px] leading-tight px-1 py-0.5 rounded border truncate ${evt.color}`}
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > (viewMode === "week" ? 10 : 3) && (
                      <span className="text-[9px] text-muted-foreground">
                        +{dayEvents.length - (viewMode === "week" ? 10 : 3)} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Sprint</span>
        <span className="flex items-center gap-1"><ListTodo className="h-3 w-3 text-info" /> Tarefa</span>
        <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-warning" /> Impedimento</span>
      </div>
    </div>
  );
}
