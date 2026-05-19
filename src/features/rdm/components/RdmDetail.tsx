import { useState } from "react";
import {
  ArrowLeft, Calendar, Clock, Boxes, AlertTriangle,
  RefreshCw, Users, CheckSquare, ThumbsUp, History,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Rdm, RdmUpdate } from "../types/rdm";
import {
  RDM_STATUS, RDM_STATUS_LABELS,
  RDM_TIPO_LABELS, RDM_AMBIENTE_LABELS,
} from "../types/rdm";
import { RdmStatusBadge }    from "./RdmStatusBadge";
import { RdmRiscoBadge }     from "./RdmRiscoBadge";
import { RdmChecklistPanel } from "./RdmChecklistPanel";

interface Props {
  rdm:      Rdm;
  onBack:   () => void;
  onUpdate: (id: string, updates: RdmUpdate) => Promise<void>;
}

export function RdmDetail({ rdm, onBack, onUpdate }: Props) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await onUpdate(rdm.id, { status: newStatus });
    } finally {
      setUpdating(false);
    }
  };

  const nextStatuses = RDM_STATUS.filter((s) => s !== rdm.status);

  return (
    <div className="space-y-5">
      {/* Topbar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex-1 min-w-0">
          {rdm.codigo && (
            <p className="text-[10px] font-mono text-muted-foreground">{rdm.codigo}</p>
          )}
          <h2 className="text-lg font-bold text-foreground truncate">{rdm.nome}</h2>
        </div>
        <RdmStatusBadge status={rdm.status} />
      </div>

      {/* Meta linha */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Boxes className="h-3 w-3" />
          {rdm.sistema_modulo}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Calendar className="h-3 w-3" />
          {new Date(rdm.data_implantacao).toLocaleDateString("pt-BR")}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Clock className="h-3 w-3" />
          {rdm.hora_inicio} → {rdm.hora_fim_prevista}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          {RDM_TIPO_LABELS[rdm.tipo_mudanca as keyof typeof RDM_TIPO_LABELS] ?? rdm.tipo_mudanca}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          {RDM_AMBIENTE_LABELS[rdm.ambiente as keyof typeof RDM_AMBIENTE_LABELS] ?? rdm.ambiente}
        </Badge>
        <RdmRiscoBadge risco={rdm.risco} />
        {rdm.downtime_previsto && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" /> Downtime
          </Badge>
        )}
        {rdm.rollback_previsto && (
          <Badge variant="outline" className="gap-1 text-xs">
            <RefreshCw className="h-3 w-3" />
            Rollback{rdm.tempo_rollback_minutos ? ` ${rdm.tempo_rollback_minutos}min` : ""}
          </Badge>
        )}
      </div>

      {/* Objetivo */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Objetivo</p>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{rdm.objetivo}</p>
      </div>

      {/* Transição de status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Mover para:</span>
        {nextStatuses.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            disabled={updating}
            onClick={() => handleStatusChange(s)}
            className="text-xs h-7"
          >
            {RDM_STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      {/* Abas */}
      <Tabs defaultValue="checklist">
        <TabsList className="h-8">
          <TabsTrigger value="checklist" className="text-xs gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="gonogo" className="text-xs gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5" /> Go/No-Go
          </TabsTrigger>
          <TabsTrigger value="participantes" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" /> Participantes
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <RdmChecklistPanel rdmId={rdm.id} />
        </TabsContent>

        <TabsContent value="gonogo" className="mt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            Painel Go/No-Go — em breve
          </p>
        </TabsContent>

        <TabsContent value="participantes" className="mt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            Lista de participantes — em breve
          </p>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            Audit log da RDM — em breve
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
