import { useState } from "react";
import { History, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminKpis } from "../hooks/useAdminKpis";
import { useSprintHistory } from "../hooks/useSprintHistory";
import { useReportBuilder } from "../hooks/useReportBuilder";
import { exportToPDF, exportToExcel } from "../utils/exportReport";
import { SprintHistoryFiltersBar } from "../components/SprintHistoryFilters";
import { SprintHistoryTable }     from "../components/SprintHistoryTable";
import { VelocityChart }          from "../components/VelocityChart";
import { TeamComparativoChart }   from "../components/TeamComparativoChart";
import { SprintDetailDrawer }     from "../components/SprintDetailDrawer";
import { ReportConfigDialog }     from "../components/ReportConfigDialog";
import { PageHeader }             from "../components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import { toast }    from "sonner";
import type { SprintMetrics } from "../hooks/useSprintHistory";
import type { ReportConfig } from "../hooks/useReportBuilder";

export function AdminHistoricoPage() {
  const { teams } = useAuth();
  const { global: adminKpisGlobal } = useAdminKpis();
  const { metrics, teamComparativo, loading, filters, setFilters } = useSprintHistory();
  const { buildPayload } = useReportBuilder({
    adminKpis:      adminKpisGlobal,
    allMetrics:     metrics,
    allComparativo: teamComparativo,
    teams,
  });

  const [selected,   setSelected]   = useState<SprintMetrics | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const handleExport = (config: ReportConfig, format: "pdf" | "excel") => {
    try {
      const payload = buildPayload(config);
      if (format === "pdf") exportToPDF(payload);
      else                  exportToExcel(payload);
      toast.success(`Relatório ${format.toUpperCase()} gerado com sucesso!`);
      setReportOpen(false);
    } catch (e) {
      toast.error("Erro ao gerar relatório");
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        iconColor="text-violet-400"
        description={
          loading
            ? "Carregando..."
            : `${metrics.length} sprint${metrics.length !== 1 ? "s" : ""} encerrado${metrics.length !== 1 ? "s" : ""}`
        }
        badges={
          !loading
            ? [{ label: filters.periodo === "all" ? "todo o histórico" : `últimos ${filters.periodo}` }]
            : []
        }
        actions={[{ label: "Exportar", icon: Download, onClick: () => setReportOpen(true), variant: "outline" }]}
      >
        {/* Filtros ficam no slot children — mantém flexibilidade */}
        <SprintHistoryFiltersBar filters={filters} teams={teams} onChange={setFilters} />
      </PageHeader>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <>
          <VelocityChart metrics={metrics} />
          {filters.teamId === "all" && teamComparativo.length > 1 && (
            <TeamComparativoChart comparativo={teamComparativo} />
          )}
          <SprintHistoryTable metrics={metrics} onSelect={setSelected} />
        </>
      )}

      <SprintDetailDrawer sprint={selected}   onClose={() => setSelected(null)} />
      <ReportConfigDialog open={reportOpen}   teams={teams} onClose={() => setReportOpen(false)} onExport={handleExport} />
    </div>
  );
}
