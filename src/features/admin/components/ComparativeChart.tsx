import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSprint } from "@/contexts/SprintContext";
import { useDemandas } from "@/features/sustentacao/hooks/useDemandas";

function labelMes(isoDate: string) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function ComparativeChart() {
  const { sprints, userStories } = useSprint();
  const { demandas } = useDemandas();

  const data = useMemo(() => {
    // Últimos 6 meses
    const meses: { mes: string; key: string }[] = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        mes: labelMes(d.toISOString()),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }

    return meses.map(({ mes, key }) => {
      const [ano, mes0] = key.split("-").map(Number);

      // HUs concluídas neste mês via sprint (usa endDate do sprint)
      const sprintsDoMes = sprints.filter(s => {
        if (!s.endDate) return false;
        const d = new Date(s.endDate);
        return d.getFullYear() === ano && (d.getMonth() + 1) === mes0;
      });
      const sprintIds = new Set(sprintsDoMes.map(s => s.id));
      const husConcluidas = userStories.filter(h =>
        sprintIds.has(h.sprintId ?? "") &&
        ["concluido", "done", "aceite", "aceite_final"].includes(h.status)
      ).length;

      // Demandas concluídas neste mês (via created_at aproximado — ideal usar aceite_data)
      const demandasConcluidas = demandas.filter(d => {
        const ref = (d as any).aceite_data || d.created_at;
        if (!ref) return false;
        const dt = new Date(ref);
        return dt.getFullYear() === ano && (dt.getMonth() + 1) === mes0 &&
          ["concluido", "resolvido", "aceite_final", "ag_aceite_final"].includes(d.situacao?.toLowerCase() ?? "");
      }).length;

      return { mes, "HUs Concluídas": husConcluidas, "Demandas Concluídas": demandasConcluidas };
    });
  }, [sprints, userStories, demandas]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Entregas por Mês — Últimos 6 meses</h3>
      <div className="rounded-xl border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="HUs Concluídas"      fill="#6366f1" radius={[4,4,0,0]} maxBarSize={32} />
            <Bar dataKey="Demandas Concluídas" fill="#2563eb" radius={[4,4,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
