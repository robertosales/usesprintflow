import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  BookOpen,
  User,
  Tag,
  Calendar,
  Layers,
  ListChecks,
  Pencil,
  Target,
} from "lucide-react";
import { UserStory } from "@/types/sprint";
import { useSprint } from "@/contexts/SprintContext";
import { formatPersonName, getInitials } from "@/lib/personName";
import { getTotalHoursForHU } from "@/types/sprint";

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  media: "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300",
  alta: "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300",
  critica: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300",
};
const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};
const AVATAR_COLORS = [
  "#16a34a", "#0891b2", "#7c3aed", "#db2777", "#ea580c",
  "#0284c7", "#9333ea", "#dc2626", "#ca8a04", "#0d9488",
];
function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface MetaRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}
function MetaRow({ icon, label, value }: MetaRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex items-center gap-1.5 w-28 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-foreground flex-1">{value}</div>
    </div>
  );
}

interface Props {
  hu: UserStory | null;
  open: boolean;
  onClose: () => void;
  onEdit: (huId: string) => void;
}

export function HUPreviewSheet({ hu, open, onClose, onEdit }: Props) {
  const { activities, developers, workflowColumns, epics, sprints } =
    useSprint() as any;

  if (!hu) return null;

  const huActivities = (activities ?? []).filter((a: any) => a.huId === hu.id);
  const closed = huActivities.filter((a: any) => a.isClosed);
  const openActs = huActivities.filter((a: any) => !a.isClosed);
  const totalHours = getTotalHoursForHU(activities, hu.id);
  const estimated = hu.estimatedHours ?? null;
  const hasActivities = huActivities.length > 0;

  const assignee = hu.assigneeId
    ? developers.find((d: any) => d.id === hu.assigneeId)
    : null;
  const epic = hu.epicId ? epics.find((e: any) => e.id === hu.epicId) : null;
  const statusCol = workflowColumns.find((c: any) => c.key === hu.status);
  const sprint = hu.sprintId
    ? sprints?.find((s: any) => s.id === hu.sprintId)
    : null;
  const initials = assignee?.name ? getInitials(assignee.name) : "?";
  const avatarBg = assignee?.name ? getAvatarColor(assignee.name) : "#6b7280";
  const shortName = assignee?.name ? formatPersonName(assignee.name) : null;

  // Badge de horas
  let hoursTextClass = "text-muted-foreground";
  let hoursBgClass = "bg-muted/40 border-border";
  let hoursBarClass = "bg-primary/50";
  if (estimated && estimated > 0) {
    const pct = totalHours / estimated;
    if (pct > 1.2) {
      hoursTextClass = "text-red-600 dark:text-red-400";
      hoursBgClass = "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
      hoursBarClass = "bg-red-500";
    } else if (pct > 1.0) {
      hoursTextClass = "text-amber-600 dark:text-amber-400";
      hoursBgClass = "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
      hoursBarClass = "bg-amber-500";
    } else if (pct > 0) {
      hoursTextClass = "text-green-600 dark:text-green-400";
      hoursBgClass = "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800";
      hoursBarClass = "bg-green-500";
    }
  }

  const hoursLabel = estimated
    ? `${totalHours}h lançadas de ${estimated}h estimadas`
    : `${totalHours}h lançadas`;

  const completionPct =
    huActivities.length > 0
      ? Math.round((closed.length / huActivities.length) * 100)
      : 0;

  const hasImpediments = (hu as any).impediments?.some(
    (i: any) => !i.resolvedAt
  );
  const impedimentCount = hasImpediments
    ? (hu as any).impediments.filter((i: any) => !i.resolvedAt).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      {/* Largura adaptativa: sem atividades = 520px, com atividades = 760px */}
      <DialogContent
        className={`${
          hasActivities ? "max-w-[760px]" : "max-w-[520px]"
        } w-[92vw] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl`}
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {hu.code}
                </span>
                {hu.priority && (
                  <Badge
                    variant="outline"
                    className={`text-[11px] px-2 py-0.5 font-medium ${
                      PRIORITY_COLORS[hu.priority] ?? ""
                    }`}
                  >
                    {PRIORITY_LABELS[hu.priority]}
                  </Badge>
                )}
                {statusCol && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusCol.dotColor}`} />
                    {statusCol.label}
                  </span>
                )}
              </div>
              <DialogTitle className="text-[15px] font-semibold text-foreground mt-2 leading-snug">
                {hu.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* ── BODY ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className={`${
            hasActivities
              ? "grid grid-cols-1 md:grid-cols-[1fr_1.4fr] divide-y md:divide-y-0 md:divide-x divide-border"
              : "flex flex-col"
          }`}>

            {/* Coluna esquerda — Informações */}
            <div className="px-5 py-4 space-y-1 bg-muted/10">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 pb-1 border-b">
                Informações
              </p>

              {statusCol && (
                <MetaRow
                  icon={<Tag className="h-3 w-3" />}
                  label="Status"
                  value={
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusCol.dotColor}`} />
                      {statusCol.label}
                    </span>
                  }
                />
              )}

              {assignee && (
                <MetaRow
                  icon={<User className="h-3 w-3" />}
                  label="Responsável"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        {assignee.avatarUrl || assignee.avatar ? (
                          <AvatarImage src={assignee.avatarUrl ?? assignee.avatar} />
                        ) : null}
                        <AvatarFallback
                          className="text-[8px] font-bold text-white"
                          style={{ backgroundColor: avatarBg }}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {shortName ?? assignee.name}
                    </span>
                  }
                />
              )}

              {epic && (
                <MetaRow
                  icon={<Layers className="h-3 w-3" />}
                  label="Épico"
                  value={
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: epic.color }}
                      />
                      <span className="truncate max-w-[180px]">{epic.name}</span>
                    </span>
                  }
                />
              )}

              {sprint && (
                <MetaRow
                  icon={<Target className="h-3 w-3" />}
                  label="Sprint"
                  value={
                    <span>
                      {sprint.name}
                      {sprint.isActive && (
                        <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded-full font-semibold">
                          ativa
                        </span>
                      )}
                    </span>
                  }
                />
              )}

              {(hu.startDate || hu.endDate) && (
                <MetaRow
                  icon={<Calendar className="h-3 w-3" />}
                  label="Período"
                  value={
                    <span className="text-sm">
                      {hu.startDate && (
                        <span>{new Date(hu.startDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                      )}
                      {hu.startDate && hu.endDate && (
                        <span className="text-muted-foreground mx-1.5">→</span>
                      )}
                      {hu.endDate && (
                        <span>{new Date(hu.endDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                      )}
                    </span>
                  }
                />
              )}

              {hu.storyPoints != null && hu.storyPoints > 0 && (
                <MetaRow
                  icon={<Tag className="h-3 w-3" />}
                  label="Story Pts"
                  value={`${hu.storyPoints} pts`}
                />
              )}

              <Separator className="my-2" />

              {/* Badge de horas */}
              <div className={`rounded-lg border px-3 py-2.5 space-y-2 ${hoursBgClass}`}>
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${hoursTextClass}`}>
                    <Clock className="h-3.5 w-3.5" />
                    Horas
                  </span>
                  {estimated && estimated > 0 && (
                    <span className={`text-xs font-bold ${hoursTextClass}`}>
                      {Math.round((totalHours / estimated) * 100)}%
                    </span>
                  )}
                </div>
                <p className={`text-xs font-medium ${hoursTextClass}`}>{hoursLabel}</p>
                {estimated && estimated > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${hoursBarClass}`}
                      style={{
                        width: `${Math.min((totalHours / estimated) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Impedimento */}
              {hasImpediments && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2.5 mt-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {impedimentCount} impedimento{impedimentCount > 1 ? "s" : ""} ativo{impedimentCount > 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Descrição — só aparece quando NÃO há atividades */}
              {!hasActivities && hu.description && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Descrição
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {hu.description}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Coluna direita — Atividades (só renderiza quando há atividades) */}
            {hasActivities && (
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" />
                    Atividades ({huActivities.length})
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {closed.length}
                    </span>
                    <span className="text-border">/</span>
                    <span className="flex items-center gap-1">
                      <Circle className="h-3 w-3" />
                      {openActs.length}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground w-9 text-right">
                    {completionPct}%
                  </span>
                </div>

                {/* Lista */}
                <div className="space-y-1 max-h-[280px] overflow-y-auto pr-0.5">
                  {huActivities.map((a: any) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs border transition-colors ${
                        a.isClosed
                          ? "bg-muted/30 border-border/50 text-muted-foreground"
                          : "bg-card border-border text-foreground"
                      }`}
                    >
                      {a.isClosed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      )}
                      <span
                        className={`flex-1 truncate ${
                          a.isClosed ? "line-through opacity-60" : ""
                        }`}
                      >
                        {a.title}
                      </span>
                      {a.hours != null && (
                        <span className="shrink-0 font-semibold tabular-nums">
                          {a.hours}h
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Descrição — aparece embaixo das atividades */}
                {hu.description && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Descrição
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                        {hu.description}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="border-t px-5 py-3 flex items-center justify-end gap-2 bg-muted/10 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              onClose();
              onEdit(hu.id);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar HU
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
