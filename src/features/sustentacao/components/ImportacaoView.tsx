import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  FolderKanban,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImportacaoDemandas } from "../hooks/useImportacaoDemandas";
import { useImportacaoProjetos } from "../hooks/useImportacaoProjetos";
import { ImportacaoPreviewTable } from "./ImportacaoPreviewTable";
import { cn } from "@/lib/utils";

export function ImportacaoView() {
  const [mode, setMode] = useState<"demandas" | "projetos" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    loading,
    showPreview,
    validRows,
    errors,
    autoCreatedTypes,
    result,
    progressMap,
    handleFile: handleFileDemandas,
    handleImport,
    cancelPreview,
    setResult,
    setProgressMap,
  } = useImportacaoDemandas();

  const {
    loading: loadingProjetos,
    result: projetoResult,
    handleFile: handleFileProjetos,
    setResult: setProjetoResult,
  } = useImportacaoProjetos();

  // ─── Render: seleção inicial ─────────────────────────────────────────────

  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 max-w-4xl mx-auto py-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">O que você deseja importar?</h2>
          <p className="text-muted-foreground">Selecione o tipo de dado para iniciar o processo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-4">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-gray-100 hover:border-blue-200 group"
            onClick={() => setMode("demandas")}
          >
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">Demandas</h3>
                <p className="text-sm text-muted-foreground">
                  Importar do Redmine via arquivo .csv ou .xlsx
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-gray-100 hover:border-blue-200 group"
            onClick={() => setMode("projetos")}
          >
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <FolderKanban className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">Projetos</h3>
                <p className="text-sm text-muted-foreground">
                  Importar sistemas de sustentação e suas configurações
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Render: tela principal ───────────────────────────────────────────────

  const isDemandas = mode === "demandas";
  const headerIconBg = isDemandas ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600";
  const HeaderIcon = isDemandas ? FileSpreadsheet : FolderKanban;

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Voltar */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-gray-900 transition-colors"
          onClick={() => {
            setMode(null);
            setResult(null);
            setProjetoResult(null);
            cancelPreview();
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para seleção
        </Button>
      </div>

      <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-start gap-5">
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0", headerIconBg)}>
              <HeaderIcon className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-gray-900">
                {isDemandas ? "Importar do Redmine" : "Importar Projetos"}
              </CardTitle>
              <CardDescription className="text-gray-500 leading-relaxed">
                {isDemandas ? (
                  <>
                    Faça upload do arquivo .csv exportado do Redmine.<br />
                    Colunas obrigatórias: <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">#</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Projeto</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Tipo</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Criado em</code>.<br />
                    Colunas opcionais: <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Título</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Situação</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Regime de Atendimento</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Defeito Impeditivo</code>.
                  </>
                ) : (
                  <>
                    Faça upload do arquivo .csv com as colunas: <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Nome</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Descrição</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">Equipe</code>, <code className="bg-gray-100 px-1 rounded text-gray-900 font-mono text-xs">SLA</code>.<br />
                    <span className="inline-flex items-center px-2 py-0.5 mt-2 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                      Projetos já cadastrados serão ignorados
                    </span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-4 space-y-6">
          {/* ── Área de upload ── */}
          {!showPreview && !result && !projetoResult && (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center space-y-4 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer group"
              onClick={() => inputRef.current?.click()}
            >
              <div className="w-12 h-12 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">Clique para selecionar ou arraste o arquivo</p>
                <p className="text-xs text-gray-500">Suporta arquivos .csv e .xlsx</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={isDemandas ? handleFileDemandas : handleFileProjetos}
                className="hidden"
              />
              <Button
                variant="outline"
                className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 mt-2"
                disabled={loading || loadingProjetos}
              >
                {(loading || loadingProjetos) ? "Processando..." : "Selecionar Arquivo"}
              </Button>
            </div>
          )}

          {/* ── Erros de validação do CSV ── */}
          {isDemandas && errors.length > 0 && (
            <div className="border border-red-100 rounded-xl p-4 space-y-3 bg-red-50/30">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Linhas com erro (não serão importadas)
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm bg-white p-2 rounded-lg border border-red-50 shadow-sm">
                    <span className="font-mono font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded text-xs">#{err.linha}</span>
                    <span className="text-gray-700">{err.mensagem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Aviso de tipos auto-criados ── */}
          {isDemandas && autoCreatedTypes.length > 0 && !result && (
            <div className="border border-amber-100 rounded-xl p-4 space-y-2 bg-amber-50/30">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Novos Tipos Detectados
              </p>
              <div className="flex flex-wrap gap-2">
                {autoCreatedTypes.map((t, i) => (
                  <span key={i} className="px-2 py-1 bg-white border border-amber-100 rounded-md text-xs font-medium text-amber-800">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-amber-600 italic">Estes tipos serão criados automaticamente durante a importação.</p>
            </div>
          )}

          {/* ── Tabela comparativa de preview ── */}
          {isDemandas && showPreview && (
            <ImportacaoPreviewTable
              rows={validRows}
              onConfirm={handleImport}
              onCancel={cancelPreview}
              loading={loading}
              progressMap={progressMap}
            />
          )}

          {/* ── Resultado final: demandas ── */}
          {isDemandas && result && !showPreview && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <p className="font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Resumo da Importação
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                  onClick={() => {
                    setResult(null);
                    setProgressMap(new Map());
                  }}
                >
                  Importar outro arquivo
                </Button>
              </div>

              {/* Grid de Indicadores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-3xl font-bold text-emerald-700">{result.importados}</p>
                  <p className="text-xs font-medium text-emerald-600 mt-1 uppercase tracking-wider">Criados</p>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-3xl font-bold text-blue-700">{result.atualizados}</p>
                  <p className="text-xs font-medium text-blue-600 mt-1 uppercase tracking-wider">Atualizados</p>
                </div>
                <div className="text-center p-6 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-3xl font-bold text-red-700">{result.erros}</p>
                  <p className="text-xs font-medium text-red-600 mt-1 uppercase tracking-wider">Erros</p>
                </div>
              </div>

              {/* Log de falhas */}
              {result.falhas && result.falhas.length > 0 && (
                <div className="border border-red-100 rounded-xl p-4 bg-red-50/30 space-y-3">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Demandas que falharam na migração ({result.falhas.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {result.falhas.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-white p-2 rounded-lg border border-red-50 shadow-sm">
                        <span className="font-mono font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded text-xs">#{f.rhm}</span>
                        <span className="text-gray-500 text-xs shrink-0">{f.projeto}</span>
                        <span className="text-red-700 font-medium ml-auto truncate" title={f.motivo}>
                          {f.motivo}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Resultado final: projetos ── */}
          {mode === "projetos" && projetoResult && (
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Resultado da Importação de Projetos
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProjetoResult(null)}
                >
                  Novo Upload
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-3xl font-bold text-emerald-700">{projetoResult.importados}</p>
                  <p className="text-xs font-medium text-emerald-600 mt-1 uppercase tracking-wider">Importados</p>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-3xl font-bold text-gray-700">{projetoResult.existentes}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">Existentes</p>
                </div>
                <div className="text-center p-6 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-3xl font-bold text-red-700">{projetoResult.erros}</p>
                  <p className="text-xs font-medium text-red-600 mt-1 uppercase tracking-wider">Erros</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
