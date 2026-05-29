import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useImportacaoDemandas() {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [autoCreatedTypes, setAutoCreatedTypes] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<Map<string, any>>(new Map());

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Implementação mock/simplificada para build
    toast.info("Processando arquivo...");
  };

  const handleImport = async (selected: any[]) => {
    setLoading(true);
    // Lógica de importação
    setLoading(false);
  };

  const cancelPreview = () => {
    setShowPreview(false);
    setValidRows([]);
  };

  return {
    loading,
    showPreview,
    validRows,
    errors,
    autoCreatedTypes,
    result,
    progressMap,
    handleFile,
    handleImport,
    cancelPreview,
    setResult,
    setProgressMap,
  };
}
