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
    title: "Tempo M\u00e9dio",
    description: "TMR \u00b7 MTTR \u00b7 TMA \u00b7 MTTA por analista e per\u00edodo",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    id: "sla",
    title: "SLA Compliance",
    description: "Cumprimento do acordo de n\u00edvel de servi\u00e7o por chamado",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "produtividade",
    title: "Produtividade",
    description: "Atividades, horas lan\u00e7adas e taxa de resolu\u00e7\u00e3o por analista",
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "imr",
    title: "IMR Grupo 2",
    description: "IAP \u00b7 IQS \u00b7 ICT \u00b7 ISS \u2014 indicadores e glosas contratuais",
    icon: <BarChart3 className="h-5 w-5" />,
    badge: "Contratual",
  },
];

export function SustentacaoRelatorios() {
  const [selected, setSelected] = useState<string | null>(null);

  const handleBack = () => setSelected(null);

  if (selected === "tempo")         return <RelatorioTempoMedio   onBack={handleBack} />;
  if (selected === "sla")           return <RelatorioSLA           onBack={handleBack} />;
  if (selected === "produtividade") return <RelatorioProdutividade onBack={handleBack} />;
  if (selected === "imr")           return <RelatorioIMR           onBack={handleBack} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Relat\u00f3rios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Selecione um relat\u00f3rio abaixo para visualizar os dados do per\u00edodo.
        </p>
      </div>

      <ReportCatalog
        items={CATALOG_ITEMS}
        onSelect={setSelected}
      />
    </div>
  );
}
