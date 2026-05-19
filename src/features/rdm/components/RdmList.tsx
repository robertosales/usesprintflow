import { useState } from "react";
import { Plus, Search, RefreshCw, FileText, Calendar, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Rdm } from "../types/rdm";
import {
  RDM_STATUS, RDM_STATUS_LABELS,
  RDM_TIPO_LABELS, RDM_AMBIENTE_LABELS,
} from "../types/rdm";
import { RdmStatusBadge } from "./RdmStatusBadge";
import { RdmRiscoBadge } from "./RdmRiscoBadge";

interface Props {
  rdms:     Rdm[];
  loading:  boolean;
  onNew:    () => void;
  onSelect: (rdm: Rdm) => void;
  onRefresh: () => void;
}

export function RdmList({ rdms, loading, onNew, onSelect, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filtered = rdms.filter((r) => {
    const matchesSearch =
      !search ||
      r.nome.toLowerCase().includes(search.toLowerCase()) ||
      (r.codigo ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.sistema_modulo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "todos" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou sistema…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={onNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova RDM
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setStatusFilter("todos")}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            statusFilter === "todos"
              ? "bg-primary/15 text-primary border border-primary/25"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Todos ({rdms.length})
        </button>
        {RDM_STATUS.map((s) => {
          const count = rdms.filter((r) => r.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {RDM_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
          <FileText className="h-12 w-12 opacity-30" />
          <p className="text-sm font-medium">
            {rdms.length === 0 ? "Nenhuma RDM cadastrada" : "Nenhuma RDM encontrada para o filtro"}
          </p>
          {rdms.length === 0 && (
            <Button size="sm" variant="outline" onClick={onNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> Criar primeira RDM
            </Button>
          )}
        </div>
      )}

      {/* Grid de cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((rdm) => (
            <button
              key={rdm.id}
              onClick={() => onSelect(rdm)}
              className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30
                hover:bg-card/80 transition-all shadow-sm group space-y-3"
            >
              {/* Header do card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {rdm.codigo && (
                    <p className="text-[10px] font-mono text-muted-foreground mb-0.5">{rdm.codigo}</p>
                  )}
                  <p className="text-sm font-semibold text-foreground truncate leading-snug group-hover:text-primary transition-colors">
                    {rdm.nome}
                  </p>
                </div>
                <RdmStatusBadge status={rdm.status} className="shrink-0" />
              </div>

              {/* Meta */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Boxes className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{rdm.sistema_modulo}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {new Date(rdm.data_implantacao).toLocaleDateString("pt-BR")} &middot;
                    {" "}{rdm.hora_inicio} → {rdm.hora_fim_prevista}
                  </span>
                </div>
              </div>

              {/* Badges inferiores */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] h-5">
                  {RDM_TIPO_LABELS[rdm.tipo_mudanca as keyof typeof RDM_TIPO_LABELS] ?? rdm.tipo_mudanca}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5">
                  {RDM_AMBIENTE_LABELS[rdm.ambiente as keyof typeof RDM_AMBIENTE_LABELS] ?? rdm.ambiente}
                </Badge>
                <RdmRiscoBadge risco={rdm.risco} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
