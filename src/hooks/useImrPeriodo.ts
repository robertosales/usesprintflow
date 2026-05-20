import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

// ─── Tipos alinhados com o retorno real do RPC ───────────────────────────────

export interface ImrIndice {
  valor: number
}

export interface ImrIap extends ImrIndice {
  qdap: number
  qdtot: number
}

export interface ImrIqs extends ImrIndice {
  qdr: number
  qde: number
}

export interface ImrIct extends ImrIndice {
  total: number
}

export interface ImrIss extends ImrIndice {
  total: number
}

export interface ImrGlosaEvento {
  count: number
  total: number
}

export interface ImrGlosas {
  totalIntegral: number
  totalLimitada: number
  byEvento: Record<string, ImrGlosaEvento>
}

export interface ImrE8Alert {
  demandaId: string
  rhm: string
  projeto: string
  tipo: string
  situacao: string
  prazo: string
  diasAtraso: number
  tipo_alerta: 'alerta' | 'glosa'
}

export interface ImrPeriodoResult {
  iap: ImrIap
  iqs: ImrIqs
  ict: ImrIct
  iss: ImrIss
  glosas: ImrGlosas
  e8Alerts: ImrE8Alert[]
}

// ─── Parâmetros do hook ───────────────────────────────────────────────────────

export interface UseImrPeriodoParams {
  teamId: string
  inicio: Date
  fim: Date
  e8Alerta?: number   // dias mínimos para alerta  (default 45)
  e8Glosa?: number    // dias mínimos para glosa   (default 60)
  enabled?: boolean   // permite desabilitar a query (default true)
}

// ─── Estado retornado ─────────────────────────────────────────────────────────

export interface UseImrPeriodoReturn {
  data: ImrPeriodoResult | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ─── Valores padrão do resultado (evita null checks no componente) ────────────

export const IMR_PERIODO_EMPTY: ImrPeriodoResult = {
  iap:    { valor: 0, qdap: 0, qdtot: 0 },
  iqs:    { valor: 0, qdr: 0, qde: 0 },
  ict:    { valor: 0, total: 0 },
  iss:    { valor: 0, total: 0 },
  glosas: { totalIntegral: 0, totalLimitada: 0, byEvento: {} },
  e8Alerts: [],
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImrPeriodo({
  teamId,
  inicio,
  fim,
  e8Alerta = 45,
  e8Glosa  = 60,
  enabled  = true,
}: UseImrPeriodoParams): UseImrPeriodoReturn {
  const [data,    setData]    = useState<ImrPeriodoResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!enabled || !teamId) return

    setLoading(true)
    setError(null)

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'calc_imr_periodo',
      {
        p_team_id:   teamId,
        p_inicio:    inicio.toISOString(),
        p_fim:       fim.toISOString(),
        p_e8_alerta: e8Alerta,
        p_e8_glosa:  e8Glosa,
      }
    )

    if (rpcError) {
      setError(rpcError.message)
      setData(null)
    } else {
      setData((rpcData as ImrPeriodoResult) ?? IMR_PERIODO_EMPTY)
    }

    setLoading(false)
  }, [teamId, inicio, fim, e8Alerta, e8Glosa, enabled])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
