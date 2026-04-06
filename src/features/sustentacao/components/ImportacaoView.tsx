import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { upsertDemandas } from "../services/demandas.service";
import { TIPOS_DEMANDA_IMR, calcPrazoInicio, calcPrazoSolucao, isSolucaoDefinidaNaOS } from "../types/imr";
import { useProjetos } from "../hooks/useProjetos";
import * as XLSX from "xlsx";
import { parse, isValid, startOfDay, format } from "date-fns";

const VALID_TIPOS_MAP: Record<string, string> = {};
TIPOS_DEMANDA_IMR.forEach(t => {
  VALID_TIPOS_MAP[t.label.toLowerCase()] = t.value;
  VALID_TIPOS_MAP[t.value] = t.value;
});

function parseDataInicio(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isValid(raw) ? raw : null;
  const str = String(raw).trim();
  // Try DD/MM/YYYY HH:MM
  let d = parse(str, "dd/MM/yyyy HH:mm", new Date());
  if (isValid(d)) return d;
  // Try DD/MM/YYYY
  d = parse(str, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  // Try ISO
  d = new Date(str);
  return isValid(d) ? d : null;
}

function normalizeTipo(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  // Direct match
  if (VALID_TIPOS_MAP[lower]) return VALID_TIPOS_MAP[lower];
  // Fuzzy: check if any label starts with or contains the value
  for (const [key, val] of Object.entries(VALID_TIPOS_MAP)) {
    if (key.includes(lower) || lower.includes(key)) return val;
  }
  // Legacy
  if (lower === 'corretiva') return 'manutencao_corretiva';
  if (lower === 'evolutiva') return 'evolutiva_pequeno_porte';
  return null;
}

interface ValidationError {
  linha: number;
  mensagem: string;
}

interface ParsedRow {
  rhm: string;
  projeto: string;
  tipo: string;
  data_inicio: Date;
  situacao?: string;
  sla?: string;
  tipo_defeito?: string;
  originada_diagnostico?: boolean;
  demandante?: string;
  ordem_servico?: string;
  descricao?: string;
  data_previsao_encerramento?: string;
  prazo_inicio_atendimento?: string;
  prazo_solucao?: string;
}

export function ImportacaoView() {
  const { currentTeamId } = useAuth();
  const { projetos } = useProjetos();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ importados: number; atualizados: number; erros: number } | null>(null);
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const projetoNames = new Set(projetos.map(p => p.nome.toLowerCase()));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTeamId) return;

    setResult(null);
    setShowPreview(false);
    setErrors([]);
    setValidRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      const today = startOfDay(new Date());
      const parsed: ParsedRow[] = [];
      const errs: ValidationError[] = [];

      rows.forEach((r, idx) => {
        const linha = idx + 2; // header is row 1
        const rhm = String(r['RHM'] || r['rhm'] || '').trim();
        const projeto = String(r['Projeto'] || r['projeto'] || '').trim();
        const tipoRaw = String(r['Tipo'] || r['tipo'] || '').trim();
        const dataInicioRaw = r['Data de Início'] || r['Data de Inicio'] || r['data_inicio'] || r['Data_Inicio'] || null;

        // Validate RHM
        if (!rhm) { errs.push({ linha, mensagem: 'RHM não informado.' }); return; }

        // Validate Projeto
        if (!projeto) { errs.push({ linha, mensagem: 'Projeto não informado.' }); return; }
        if (!projetoNames.has(projeto.toLowerCase())) {
          errs.push({ linha, mensagem: `Projeto '${projeto}' não encontrado.` }); return;
        }

        // Validate Tipo
        if (!tipoRaw) { errs.push({ linha, mensagem: 'Tipo não informado.' }); return; }
        const tipoNorm = normalizeTipo(tipoRaw);
        if (!tipoNorm) { errs.push({ linha, mensagem: `Tipo '${tipoRaw}' não reconhecido.` }); return; }

        // Validate Data de Início
        if (!dataInicioRaw) { errs.push({ linha, mensagem: 'Data de Início inválida ou ausente.' }); return; }
        const dataInicio = parseDataInicio(dataInicioRaw);
        if (!dataInicio) { errs.push({ linha, mensagem: 'Data de Início inválida ou ausente.' }); return; }
        if (startOfDay(dataInicio) < today) {
          errs.push({ linha, mensagem: 'Data de início retroativa não é permitida. Cadastre esta demanda manualmente.' }); return;
        }

        // Optional fields
        const situacao = String(r['Situação'] || r['Situacao'] || r['situacao'] || 'nova').trim().toLowerCase().replace(/\s+/g, '_');
        const isCorretiva = tipoNorm === 'manutencao_corretiva';

        let sla = 'padrao';
        const regimeRaw = String(r['Regime de Atendimento'] || r['Regime'] || r['regime'] || '').trim().toLowerCase();
        if (isCorretiva && (regimeRaw === 'contínuo' || regimeRaw === 'continuo')) sla = 'continuo';

        let tipo_defeito: string | undefined;
        const defeitoRaw = String(r['Tipo de Defeito'] || r['tipo_defeito'] || '').trim().toLowerCase();
        if (isCorretiva && defeitoRaw) {
          tipo_defeito = defeitoRaw.includes('não') || defeitoRaw.includes('nao') ? 'nao_impeditivo' : 'impeditivo';
        } else if (isCorretiva) {
          tipo_defeito = 'impeditivo';
        }

        let originada_diagnostico = false;
        const diagRaw = String(r['Originada de Diagnóstico'] || r['Originada de Diagnostico'] || '').trim().toLowerCase();
        if (isCorretiva && (diagRaw === 'sim' || diagRaw === 'true' || diagRaw === '1')) originada_diagnostico = true;

        // Calculate deadlines from Data de Início
        const regime = isCorretiva ? sla : undefined;
        const defeito = isCorretiva ? tipo_defeito : undefined;
        const prazoInicio = calcPrazoInicio(dataInicio, tipoNorm, regime, defeito);
        const prazoSolucao = calcPrazoSolucao(dataInicio, tipoNorm, regime, defeito);

        const demandanteVal = String(r['Demandante'] || r['demandante'] || '').trim() || undefined;
        const osVal = String(r['OS'] || r['os'] || r['Ordem de Serviço'] || '').trim() || undefined;
        const descVal = String(r['Descrição'] || r['Descricao'] || r['descricao'] || '').trim() || undefined;
        const prevEncRaw = r['Data de Previsão de Encerramento'] || r['Data Previsão Encerramento'] || null;
        let prevEnc: string | undefined;
        if (prevEncRaw) {
          const d = parseDataInicio(prevEncRaw);
          if (d) prevEnc = format(d, 'yyyy-MM-dd');
        }

        parsed.push({
          rhm, projeto, tipo: tipoNorm, data_inicio: dataInicio,
          situacao, sla, tipo_defeito, originada_diagnostico,
          demandante: demandanteVal, ordem_servico: osVal, descricao: descVal,
          data_previsao_encerramento: prevEnc || (prazoSolucao ? format(prazoSolucao, 'yyyy-MM-dd') : undefined),
          prazo_inicio_atendimento: prazoInicio?.toISOString(),
          prazo_solucao: prazoSolucao?.toISOString(),
        });
      });

      setValidRows(parsed);
      setErrors(errs);
      setShowPreview(true);

      if (parsed.length === 0 && errs.length === 0) {
        toast.error("Nenhuma linha encontrada no arquivo.");
      }
    } catch (err: any) {
      toast.error("Erro ao processar arquivo.");
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!currentTeamId || validRows.length === 0) return;
    setLoading(true);

    const results = { importados: 0, atualizados: 0, erros: 0 };
    for (const row of validRows) {
      try {
        const res = await upsertDemandas(currentTeamId, [{
          rhm: row.rhm, projeto: row.projeto, situacao: row.situacao || 'nova', tipo: row.tipo,
        }]);
        results.importados += res.importados;
        results.atualizados += res.atualizados;
        results.erros += res.erros;
      } catch {
        results.erros++;
      }
    }

    setResult(results);
    setShowPreview(false);
    toast.success(`Importação concluída: ${results.importados} novos, ${results.atualizados} atualizados`);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">Importar Demandas</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Importar do Excel</CardTitle>
          <CardDescription>
            Faça upload de um arquivo .xlsx com as colunas obrigatórias: <strong>RHM, Projeto, Tipo, Data de Início</strong>.
            <br />
            <span className="text-xs text-muted-foreground">Não são aceitas demandas com data de início retroativa.</span>
          </CardDescription>
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

          {/* Preview with validation */}
          {showPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 flex-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">{validRows.length} válida(s) pronta(s) para importar</span>
                </div>
                {errors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">{errors.length} com erro(s)</span>
                  </div>
                )}
              </div>

              {/* Error list */}
              {errors.length > 0 && (
                <div className="border border-destructive/30 rounded-lg p-3 space-y-1.5 max-h-48 overflow-y-auto bg-destructive/5">
                  <p className="text-xs font-semibold text-destructive uppercase">Erros encontrados:</p>
                  {errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                      <span>⚠️ Linha {err.linha}: {err.mensagem}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  style={{ backgroundColor: '#1a6fa8' }}
                  className="hover:opacity-90 text-white"
                  onClick={handleImport}
                  disabled={loading || validRows.length === 0}
                >
                  {loading ? 'Importando...' : `Importar somente as válidas (${validRows.length})`}
                </Button>
                <Button variant="outline" onClick={() => { setShowPreview(false); setValidRows([]); setErrors([]); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Resultado da importação</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-emerald-50 rounded"><p className="text-lg font-bold text-emerald-700">{result.importados}</p><p className="text-xs text-muted-foreground">Importados</p></div>
                <div className="text-center p-2 rounded" style={{ backgroundColor: '#e8f2fa' }}><p className="text-lg font-bold" style={{ color: '#1a6fa8' }}>{result.atualizados}</p><p className="text-xs text-muted-foreground">Atualizados</p></div>
                <div className="text-center p-2 bg-red-50 rounded"><p className="text-lg font-bold text-destructive">{result.erros}</p><p className="text-xs text-muted-foreground">Erros</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}