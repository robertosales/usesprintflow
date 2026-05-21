import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings2, Pencil, Trash2 } from "lucide-react";
import { HorasInput, hhmmToDecimal } from "@/shared/components/common/HorasInput";
import { toast } from "sonner";

interface ActivitiesTabProps {
  total: number;
  isAdmin: boolean;
  fases: any[];
  fasesMap: Record<string, string>;
  hours: any[];
  profilesMap: Map<string, string>;
  addHour: (h: any) => Promise<void>;
  updateHour: (id: string, h: any) => Promise<void>;
  removeHour: (id: string) => Promise<void>;
  setShowFasesManager: (val: boolean) => void;
  setShowEditHourDialog: (val: boolean) => void;
  setEditHour: (val: any) => void;
  setDeleteHourId: (val: string) => void;
  profileName: string;
}

function minutesToDisplay(horas: number): string {
  const totalMinutes = Math.round(horas * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function ActivitiesTab({
  total,
  isAdmin,
  fases,
  fasesMap,
  hours,
  profilesMap,
  addHour,
  setShowFasesManager,
  setShowEditHourDialog,
  setEditHour,
  setDeleteHourId,
  profileName,
}: ActivitiesTabProps) {
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const [hourForm, setHourForm] = useState({
    horas: "",
    fase: "execucao",
    descricao: "",
    data: todayISO(),
  });

  const handleAddHour = async () => {
    const horasDecimal = hhmmToDecimal(hourForm.horas);
    if (!horasDecimal || horasDecimal <= 0) {
      toast.error("Informe um tempo válido.");
      return;
    }
    const created_at = hourForm.data
      ? new Date(hourForm.data + "T12:00:00").toISOString()
      : undefined;
    await addHour({ horas: horasDecimal, fase: hourForm.fase, descricao: hourForm.descricao, created_at });
    setHourForm({ horas: "", fase: "execucao", descricao: "", data: todayISO() });
  };

  return (
    <div className="mt-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Total Acumulado: <span className="text-info">{minutesToDisplay(total)}</span>
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Lançar Horas</CardTitle>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowFasesManager(true)} title="Gerenciar fases">
                <Settings2 className="h-3.5 w-3.5" />Gerenciar Fases
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={hourForm.data}
                max={todayISO()}
                onChange={(e) => setHourForm((p) => ({ ...p, data: e.target.value }))}
                className="w-40 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Tempo (HH:MM)</Label>
              <HorasInput
                value={hourForm.horas}
                onChange={(v) => setHourForm((p) => ({ ...p, horas: v }))}
                placeholder="00:00"
                className="w-28 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Fase</Label>
              <Select value={hourForm.fase} onValueChange={(v) => setHourForm((p) => ({ ...p, fase: v }))}>
                <SelectTrigger className="mt-1 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{fases.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={hourForm.descricao}
                onChange={(e) => setHourForm((p) => ({ ...p, descricao: e.target.value }))}
                className="mt-1"
                placeholder="Descreva a atividade..."
              />
            </div>
            <Button size="sm" onClick={handleAddHour} className="gap-1.5">
              <Plus className="h-4 w-4" />Lançar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Lançado por: {profileName}</p>
        </CardContent>
      </Card>

      {hours.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Fase</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Descrição</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Lançado por</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Tempo</th>
                {isAdmin && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hours.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-xs">{new Date(h.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2 text-xs">{fasesMap[h.fase] || h.fase}</td>
                  <td className="px-3 py-2 text-xs max-w-[200px] truncate">{h.descricao || "-"}</td>
                  <td className="px-3 py-2 text-xs">{profilesMap.get(h.user_id) || "..."}</td>
                  <td className="px-3 py-2 text-xs text-right font-mono font-medium">{minutesToDisplay(Number(h.horas))}</td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-info" onClick={() => { setEditHour(h); setShowEditHourDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteHourId(h.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
