import { useState } from "react";
import { ReportCatalog } from "@/shared/components/reports";
import type { CatalogItem } from "@/shared/components/reports";
import { RelatorioTempoMedio } from "./RelatorioTempoMedio";
import { RelatorioSLA } from "./RelatorioSLA";
import { RelatorioProdutividade } from "./RelatorioProdutividade";
import { RelatorioIMR } from "./RelatorioIMR";
import { Clock, Shield, Users, BarChart3 } from "lucide-react";

const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: "tempo",
    title: "Tempo Médio",
    description: "TMR · MTTR · TMA · MTTA por analista e período",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    id: "sla",
    title: "SLA Compliance",
    description: "Cumprimento do acordo de nível de serviço por chamado",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "produtividade",
    title: "Produtividade",
    description: "Atividades, horas lançadas e taxa de resolução por analista",
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "imr",
    title: "IMR Grupo 2",
    description: "IAP · IQS · ICT · ISS — indicadores e glosas contratuais",
    icon: <BarChart3 className="h-5 w-5" />,
    badge: "Contratual",
  },
];

export function SustentacaoRelatorios() {
  const [selected, setSelected] = useState<string | null>(null);

  const handleBack = () => setSelected(null);

  if (selected === "tempo")          return <RelatorioTempoMedio    onBack={handleBack} />;
  if (selected === "sla")            return <RelatorioSLA            onBack={handleBack} />;
  if (selected === "produtividade")  return <RelatorioProdutividade  onBack={handleBack} />;
  if (selected === "imr")            return <RelatorioIMR            onBack={handleBack} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Relatórios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Selecione um relatório abaixo para visualizar os dados do período.
        </p>
      </div>

      <ReportCatalog
        items={CATALOG_ITEMS}
        onSelect={setSelected}
      />
    </div>
  );
}
