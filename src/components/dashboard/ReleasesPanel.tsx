import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Rocket, CheckCircle2, AlertTriangle, RotateCcw,
  CalendarDays, Tag, Layers, Bug,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  teamId: string;
  sprints: { id: string; name: string }[];
}

const STATUS_CONFIG = {
  success:  { label: "Sucesso",    icon: CheckCircle2,  color: "#22c55e", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  failure:  { label: "Com Falha",  icon: AlertTriangle, color: "#eab308", bg: "bg-yellow-500/10",  text: "text-yellow-600 dark:text-yellow-400",  border: "border-yellow-500/30" },
  reverted: { label: "Revertida",  icon: RotateCcw,     color: "#ef4444", bg: "bg-destructive/10", text: "text-destructive",                      border: "border-destructive/30" },
} as const;

type ReleaseStatus = keyof typeof STATUS_CONFIG;

// ─── KPI row ─────────────────────────────────────────────────────────────────

function KpiPill({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-bold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── ReleaseCard ─────────────────────────────────────────────────────────────

function ReleaseCard({ release, sprint }: { release: any; sprint?: { name: string } }) {
  const status = (release.status ?? "success") as ReleaseStatus;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.success;
  const StatusIcon = cfg.icon;

  return (
    <div className={cn(
      "rounded-2xl border-l-4 border border-border/50 bg-card p-4 space-y-3 hover:shadow-sm transition-shadow",
    )}
      style={{ borderLeftColor: cfg.color }}
    >
      {/* Header: versão + status + data */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${cfg.color}18` }}
          >
            <Rocket className="h-4 w-4" style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{release.version}</p>
            {sprint && <p className="text-[11px] text-muted-foreground truncate">{sprint.name}</p>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-[10px] font-semibold gap-1 px-2 py-0.5", cfg.bg, cfg.text, cfg.border)}
          >
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-mono">
            {new Date(release.released_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Pills: HUs + Bugs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 py-1 text-xs">
          <Layers className="h-3 w-3 text-primary" />
          <span className="font-semibold tabular-nums">{release.hus_included ?? 0}</span>
          <span className="text-muted-foreground">HUs</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/8 px-2.5 py-1 text-xs">
          <Bug className="h-3 w-3 text-emerald-600" />
          <span className="font-semibold tabular-nums">{release.bugs_fixed ?? 0}</span>
          <span className="text-muted-foreground">bugs fix</span>
        </div>
      </div>

      {/* Notas */}
      {release.notes && (
        <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2 line-clamp-3">
          {release.notes}
        </p>
      )}
    </div>
  );
}

// ─── FormField helper ─────────────────────────────────────────────────────────

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── ReleasesPanel ───────────────────────────────────────────────────────────

const EMPTY_FORM = {
  version: "",
  status: "success" as ReleaseStatus,
  sprint_id: "",
  notes: "",
  hus_included: 0,
  bugs_fixed: 0,
  released_at: new Date().toISOString().split("T")[0],
};

export function ReleasesPanel({ teamId, sprints }: Props) {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadReleases = async () => {
    const { data } = await supabase
      .from("releases")
      .select("*")
      .eq("team_id", teamId)
      .order("released_at", { ascending: false });
    setReleases(data || []);
    setLoading(false);
  };

  useEffect(() => { if (teamId) loadReleases(); }, [teamId]);

  const handleSave = async () => {
    if (!form.version.trim()) { toast.error("Versão é obrigatória"); return; }
    setSaving(true);
    const { error } = await supabase.from("releases").insert({
      team_id:      teamId,
      version:      form.version,
      status:       form.status,
      sprint_id:    form.sprint_id || null,
      notes:        form.notes,
      hus_included: form.hus_included,
      bugs_fixed:   form.bugs_fixed,
      released_at:  form.released_at,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao registrar release"); return; }
    toast.success("🚀 Release registrada com sucesso!");
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    loadReleases();
  };

  // KPIs agrupados
  const totalReleases  = releases.length;
  const totalHUs       = releases.reduce((s, r) => s + (r.hus_included ?? 0), 0);
  const totalBugsFix   = releases.reduce((s, r) => s + (r.bugs_fixed ?? 0), 0);
  const successRate    = totalReleases > 0
    ? Math.round((releases.filter((r) => r.status === "success").length / totalReleases) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Releases / Publicações</p>
            <p className="text-[11px] text-muted-foreground">Histórico de deploys do time</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs gap-1.5 rounded-xl">
              <Plus className="h-3.5 w-3.5" /> Nova Release
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" /> Registrar Nova Release
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Versão" required>
                  <Input
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="v1.2.0"
                    className="rounded-xl"
                  />
                </FormField>
                <FormField label="Data">
                  <Input
                    type="date"
                    value={form.released_at}
                    onChange={(e) => setForm({ ...form, released_at: e.target.value })}
                    className="rounded-xl"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ReleaseStatus })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success">✅ Sucesso</SelectItem>
                      <SelectItem value="failure">⚠️ Com Falha</SelectItem>
                      <SelectItem value="reverted">🔄 Revertida</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Sprint">
                  <Select value={form.sprint_id} onValueChange={(v) => setForm({ ...form, sprint_id: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="HUs Incluídas">
                  <Input
                    type="number" min={0}
                    value={form.hus_included}
                    onChange={(e) => setForm({ ...form, hus_included: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </FormField>
                <FormField label="Bugs Corrigidos">
                  <Input
                    type="number" min={0}
                    value={form.bugs_fixed}
                    onChange={(e) => setForm({ ...form, bugs_fixed: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </FormField>
              </div>

              <FormField label="Notas">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Detalhes da release, principais entregas..."
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </FormField>

              <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
                {saving ? "Registrando..." : "🚀 Registrar Release"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI row (só quando há releases) */}
      {totalReleases > 0 && (
        <div className="flex flex-wrap gap-2">
          <KpiPill icon={Rocket}      label="releases"      value={totalReleases} />
          <KpiPill icon={Layers}      label="HUs entregues" value={totalHUs} />
          <KpiPill icon={Bug}         label="bugs corrigidos" value={totalBugsFix} />
          <KpiPill icon={CheckCircle2} label="taxa de sucesso" value={`${successRate}%`} />
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : releases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Rocket className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma release registrada</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em &quot;Nova Release&quot; para adicionar</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {releases.map((r: any) => (
            <ReleaseCard
              key={r.id}
              release={r}
              sprint={sprints.find((s) => s.id === r.sprint_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
