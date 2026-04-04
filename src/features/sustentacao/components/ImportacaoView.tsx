import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { upsertDemandas } from "../services/demandas.service";
import * as XLSX from "xlsx";

export function ImportacaoView() {
  const { currentTeamId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ importados: number; atualizados: number; erros: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTeamId) return;

    setLoading(true);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      const mapped = rows.map(r => ({
        rhm: String(r['RHM'] || r['rhm'] || '').trim(),
        projeto: String(r['Projeto'] || r['projeto'] || '').trim(),
        situacao: String(r['Situação'] || r['Situacao'] || r['situacao'] || 'nova').trim().toLowerCase().replace(/\s+/g, '_'),
        tipo: String(r['Tipo'] || r['tipo'] || 'corretiva').trim().toLowerCase(),
      })).filter(r => r.rhm);

      if (mapped.length === 0) {
        toast.error("Nenhuma linha válida encontrada");
        setLoading(false);
        return;
      }

      const res = await upsertDemandas(currentTeamId, mapped);
      setResult(res);
      toast.success(`Importação concluída: ${res.importados} novos, ${res.atualizados} atualizados`);
    } catch (err: any) {
      toast.error("Erro ao processar arquivo");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">Importar Demandas</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Importar do Excel</CardTitle>
          <CardDescription>Faça upload de um arquivo .xlsx com as colunas: RHM, Projeto, Situação, Tipo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arraste ou clique para selecionar</p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
              {loading ? 'Processando...' : 'Selecionar Arquivo'}
            </Button>
          </div>

          {result && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Resultado da importação</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-green-50 rounded"><p className="text-lg font-bold text-green-700">{result.importados}</p><p className="text-xs text-muted-foreground">Importados</p></div>
                <div className="text-center p-2 bg-blue-50 rounded"><p className="text-lg font-bold text-blue-700">{result.atualizados}</p><p className="text-xs text-muted-foreground">Atualizados</p></div>
                <div className="text-center p-2 bg-red-50 rounded"><p className="text-lg font-bold text-red-700">{result.erros}</p><p className="text-xs text-muted-foreground">Erros</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
