import { useState } from "react";

export function useImportacaoProjetos() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Implementação mock
  };

  return {
    loading,
    result,
    handleFile,
    setResult,
  };
}
