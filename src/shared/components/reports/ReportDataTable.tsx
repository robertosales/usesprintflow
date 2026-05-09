import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type CellStatus = "success" | "warning" | "danger" | "neutral" | "none";

export interface TableColumn<T = any> {
  key: string;
  label: string;
  /** Alinhamento — default "left" */
  align?: "left" | "right" | "center";
  /** Se true, permite ordenação por esta coluna */
  sortable?: boolean;
  /** Renderizador customizado */
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  /** Largura CSS */
  width?: string;
}

export interface TotalRow {
  /** Mapa de key → valor para células de total */
  values: Record<string, React.ReactNode>;
  /** Label da primeira coluna — default "Total" */
  label?: string;
}

export interface ReportDataTableProps<T = any> {
  titulo?: string;
  columns: TableColumn<T>[];
  data: T[];
  /** Linha de totais exibida no rodapé */
  totals?: TotalRow;
  /** Chave única por linha */
  rowKey?: (row: T, i: number) => string;
  /** Mensagem quando não há dados */
  emptyMessage?: string;
  /** Paginação — itens por página; se omitido, exibe tudo */
  pageSize?: number;
  /** Estilo da linha de totais: "muted" | "primary" — default "muted" */
  totalsStyle?: "muted" | "primary";
}

type SortDir = "asc" | "desc" | null;

export function ReportDataTable<T extends Record<string, any>>({
  titulo,
  columns,
  data,
  totals,
  rowKey,
  emptyMessage = "Nenhum dado disponível para o filtro selecionado.",
  pageSize,
  totalsStyle = "muted",
}: ReportDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
    setPage(1);
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const va = a[sortKey];
    const vb = b[sortKey];
    if (va === undefined || vb === undefined) return 0;
    if (typeof va === "number" && typeof vb === "number")
      return sortDir === "asc" ? va - vb : vb - va;
    return sortDir === "asc"
      ? String(va).localeCompare(String(vb), "pt-BR")
      : String(vb).localeCompare(String(va), "pt-BR");
  });

  const totalPages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;
  const visible = pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;

  const alignClass = (align?: string) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const SortIcon = ({ col }: { col: TableColumn }) => {
    if (!col.sortable) return null;
    if (sortKey === col.key)
      return sortDir === "asc"
        ? <ChevronUp className="h-3 w-3 inline ml-1" />
        : <ChevronDown className="h-3 w-3 inline ml-1" />;
    return <ChevronsUpDown className="h-3 w-3 inline ml-1 opacity-40" />;
  };

  return (
    <Card>
      {titulo && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{titulo}</CardTitle>
            {pageSize && data.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {data.length} registro{data.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={titulo ? "pt-0" : "pt-4"}>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
        ) : (
          <>
            <div className="overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        style={col.width ? { width: col.width } : undefined}
                        className={`text-xs font-semibold ${
                          alignClass(col.align)
                        } ${col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      >
                        {col.label}
                        <SortIcon col={col} />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {visible.map((row, i) => (
                    <TableRow
                      key={rowKey ? rowKey(row, i) : i}
                      className={i % 2 === 1 ? "bg-muted/20" : ""}
                    >
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`text-xs py-2.5 ${alignClass(col.align)}`}
                        >
                          {col.render
                            ? col.render(row[col.key], row, i)
                            : row[col.key] ?? "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                  {/* Linha de totais */}
                  {totals && (
                    <TableRow
                      className={`border-t-2 font-semibold ${
                        totalsStyle === "primary"
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/40 border-border"
                      }`}
                    >
                      {columns.map((col, ci) => (
                        <TableCell
                          key={col.key}
                          className={`text-xs py-2.5 ${alignClass(col.align)}`}
                        >
                          {ci === 0
                            ? (totals.label || "Total / Média")
                            : (totals.values[col.key] ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {pageSize && totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-muted-foreground">
                  Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                  {" · "}{data.length} registro{data.length !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs px-2"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs px-2"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
