import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelatorioTempoMedio } from "./RelatorioTempoMedio";
import { RelatorioSLA } from "./RelatorioSLA";
import { RelatorioProdutividade } from "./RelatorioProdutividade";
import { RelatorioIMR } from "./RelatorioIMR";
import { Clock, Shield, Users, BarChart3 } from "lucide-react";

export function SustentacaoRelatorios() {
  const [tab, setTab] = useState("tempo");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="tempo" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Tempo Médio</TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />SLA Compliance</TabsTrigger>
          <TabsTrigger value="produtividade" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Produtividade</TabsTrigger>
          <TabsTrigger value="imr" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />IMR Grupo 2</TabsTrigger>
        </TabsList>

        <TabsContent value="tempo"><RelatorioTempoMedio /></TabsContent>
        <TabsContent value="sla"><RelatorioSLA /></TabsContent>
        <TabsContent value="produtividade"><RelatorioProdutividade /></TabsContent>
        <TabsContent value="imr"><RelatorioIMR /></TabsContent>
      </Tabs>
    </div>
  );
}
