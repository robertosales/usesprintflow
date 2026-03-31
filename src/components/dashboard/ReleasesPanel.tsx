import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Rocket, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  teamId: string;
  sprints: { id: string; name: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  success: { label: "✅ Sucesso", icon: CheckCircle, color: "#22c55e" },
  failure: { label: "⚠️ Com Falha", icon: AlertTriangle, color: "#eab308" },
  reverted: { label: "🔄 Revertida", icon: RotateCcw, color: "#ef4444" },
};

export function ReleasesPanel({ teamId, sprints }: Props) {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    version: "",
    status: "success",
    sprint_id: "",
    notes: "",
    hus_included: 0,
    bugs_fixed: 0,
    released_at: new Date().toISOString().split("T")[0],
  });

  const loadReleases = async () => {
    const { data } = await supabase
      .from("releases")
      .select("*")
      .eq("team_id", teamId)
      .order("released_at", { ascending: false });
    setReleases(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (teamId) loadReleases();
  }, [teamId]);

  const handleSave = async () => {
    if (!form.version.trim()) {
      toast.error("Versão é obrigatória");
      return;
    }
    const { error } = await supabase.from("releases").insert({
      team_id: teamId,
      version: form.version,
      status: form.status,
      sprint_id: form.sprint_id || null,
      notes: form.notes,
      hus_included: form.hus_included,
      bugs_fixed: form.bugs_fixed,
      released_at: form.released_at,
    });
    if (error) {
      toast.error("Erro ao registrar release");
      return;
    }
    toast.success("Release registrada!");
    setDialogOpen(false);
    setForm({ version: "", status: "success", sprint_id: "", notes: "", hus_included: 0, bugs_fixed: 0, released_at: new Date().toISOString().split("T")[0] });
    loadReleases();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" /> Releases / Publicações
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nova Release
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nova Release</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Versão *</label>
                  <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v1.2.0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Data</label>
                  <Input type="date" value={form.released_at} onChange={(e) => setForm({ ...form, released_at: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success">✅ Sucesso</SelectItem>
                      <SelectItem value="failure">⚠️ Com Falha</SelectItem>
                      <SelectItem value="reverted">🔄 Revertida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Sprint</label>
                  <Select value={form.sprint_id} onValueChange={(v) => setForm({ ...form, sprint_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">HUs Incluídas</label>
                  <Input type="number" min={0} value={form.hus_included} onChange={(e) => setForm({ ...form, hus_included: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Bugs Corrigidos</label>
                  <Input type="number" min={0} value={form.bugs_fixed} onChange={(e) => setForm({ ...form, bugs_fixed: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Notas</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Detalhes da release..." rows={3} />
              </div>
              <Button onClick={handleSave} className="w-full">Registrar Release</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {releases.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Rocket className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma release registrada</p>
            <p className="text-sm mt-1">Clique em "Nova Release" para adicionar</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Data</th>
                    <th className="text-left py-3 px-4 font-medium">Versão</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-center py-3 px-4 font-medium">Sprint</th>
                    <th className="text-center py-3 px-4 font-medium">HUs</th>
                    <th className="text-center py-3 px-4 font-medium">Bugs Fix</th>
                    <th className="text-left py-3 px-4 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r: any, idx: number) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.success;
                    const sprint = sprints.find((s) => s.id === r.sprint_id);
                    return (
                      <tr key={r.id} className={`border-b last:border-0 ${idx % 2 !== 0 ? "bg-[#f8fafc] dark:bg-muted/10" : ""}`}>
                        <td className="py-2.5 px-4 font-mono text-xs">
                          {new Date(r.released_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2.5 px-4 font-semibold">{r.version}</td>
                        <td className="text-center py-2.5 px-4">
                          <Badge style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }} className="text-[10px]">
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="text-center py-2.5 px-4 text-xs">{sprint?.name || "—"}</td>
                        <td className="text-center py-2.5 px-4">{r.hus_included}</td>
                        <td className="text-center py-2.5 px-4">{r.bugs_fixed}</td>
                        <td className="py-2.5 px-4 text-xs max-w-[200px] truncate">{r.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
