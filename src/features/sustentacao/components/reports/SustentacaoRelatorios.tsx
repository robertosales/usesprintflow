import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelatorioTempoMedio } from "./RelatorioTempoMedio";
import { RelatorioSLA } from "./RelatorioSLA";
import { RelatorioProdutividade } from "./RelatorioProdutividade";
import { Clock, Shield, Users } from "lucide-react";

export function SustentacaoRelatorios() {
  const [tab, setTab] = useState("tempo");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="tempo" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Tempo Médio</TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />SLA Compliance</TabsTrigger>
          <TabsTrigger value="produtividade" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Produtividade</TabsTrigger>
        </TabsList>

        <TabsContent value="tempo"><RelatorioTempoMedio /></TabsContent>
        <TabsContent value="sla"><RelatorioSLA /></TabsContent>
        <TabsContent value="produtividade"><RelatorioProdutividade /></TabsContent>
      </Tabs>
    </div>
  );
}
