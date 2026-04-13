import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Plus, Search, ListTodo } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { PaginationControls } from "@/shared/components/common/Pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useDemandas } from "../hooks/useDemandas";
import { toast } from "sonner";
import { DemandaForm } from "./DemandaForm";
import { DemandaDetail } from "./DemandaDetail";
import { SITUACAO_LABELS, SITUACAO_COLORS, isDemandaIniciada } from "../types/demanda";
import type { Demanda } from "../types/demanda";

export function DemandasList() {
  const { demandas, loading, error, create, update, moveTo, remove, reload } = useDemandas();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Demanda | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Demanda | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterSituacao, setFilterSituacao] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return demandas.filter((d) => {
      if (
        debouncedSearch &&
        !d.rhm.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
        !d.projeto.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
        return false;
      if (filterTipo !== "all" && d.tipo !== filterTipo) return false;
      if (filterSituacao !== "all" && d.situacao !== filterSituacao) return false;
      return true;
    });
  }, [demandas, debouncedSearch, filterTipo, filterSituacao]);

  const { paginatedItems, currentPage, setCurrentPage, totalPages, totalItems } = usePagination(filtered, {
    pageSize: 20,
  });

  if (selected) {
    const current = demandas.find((d) => d.id === selected.id) || selected;
    return (
      <DemandaDetail
        demanda={current}
        onBack={() => setSelected(null)}
        onUpdate={async (id, updates) => {
          await update(id, updates);
        }}
        onMoveTo={moveTo}
      />
    );
  }

  if (loading) return <SkeletonList count={5} />;
  if (error)
    return (
      <div className="text-center py-10 text-destructive">
        {error}{" "}
        <button onClick={reload} className="underline ml-2">
          Tentar novamente
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Demandas</h2>
        <Button size="sm" className="bg-info hover:bg-info/90 text-info-foreground" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Demanda
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nenhuma demanda encontrada" />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(d)}>
                    <TableCell className="font-mono font-bold text-info">{d.rhm}</TableCell>
                    <TableCell>{d.projeto}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {d.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${SITUACAO_COLORS[d.situacao] || ""}`}>
                        {SITUACAO_LABELS[d.situacao] || d.situacao}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.sla === "continuo" ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Contínuo
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Padrão</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(d);
                            }}
                          >
                            Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDemandaIniciada(d)) {
                                toast.error(
                                  "Demanda já iniciada. Use 'Cancelar Demanda' ou 'Bloquear' na tela de detalhes.",
                                );
                              } else {
                                setDeleteTarget(d);
                              }
                            }}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={20}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <DemandaForm open={showForm} onClose={() => setShowForm(false)} onSubmit={(d) => create(d as any)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            remove(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
