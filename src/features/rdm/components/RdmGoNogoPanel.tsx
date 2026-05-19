import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2, AlertCircle } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn }       from "@/lib/utils";
import { useAuth }  from "@/contexts/AuthContext";
import { useRdmGoNogo } from "../hooks/useRdmGoNogo";
import {
  RDM_GONOGO_PAPEL, RDM_GONOGO_PAPEL_LABELS,
  type RdmGoNogoPapel,
} from "../types/rdm";

interface Props { rdmId: string }

export function RdmGoNogoPanel({ rdmId }: Props) {
  const { profile } = useAuth();
  const { votes, loading, totalGo, totalNogo, consensus, vote } = useRdmGoNogo(rdmId);
  const [selectedPapel, setSelectedPapel] = useState<RdmGoNogoPapel>("gestor_ti");
  const [justificativa, setJustificativa]  = useState("");
  const [submitting, setSubmitting]        = useState(false);

  const handleVote = async (voto: "go" | "nogo") => {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      await vote({
        rdm_id:       rdmId,
        profile_id:   profile.id,
        papel:        selectedPapel,
        voto,
        justificativa: justificativa || null,
      });
      setJustificativa("");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Consenso atual */}
      <div
        className={cn(
          "rounded-xl border p-4 flex items-center gap-4",
          consensus === "go"      && "border-emerald-500/30 bg-emerald-500/10",
          consensus === "nogo"    && "border-red-500/30 bg-red-500/10",
          consensus === "pendente" && "border-border bg-muted/30",
        )}
      >
        {consensus === "go" && <ThumbsUp  className="h-8 w-8 text-emerald-400 shrink-0" />}
        {consensus === "nogo" && <ThumbsDown className="h-8 w-8 text-red-400 shrink-0" />}
        {consensus === "pendente" && <AlertCircle className="h-8 w-8 text-muted-foreground shrink-0" />}
        <div>
          <p className="text-sm font-bold text-foreground">
            {consensus === "go"      && "✅ Consenso: GO"}
            {consensus === "nogo"    && "🚫 Consenso: NO-GO"}
            {consensus === "pendente" && "⏳ Aguardando votos"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalGo} GO &nbsp;·&nbsp; {totalNogo} NO-GO &nbsp;·&nbsp; {votes.length} voto{votes.length !== 1 ? "s" : ""} registrado{votes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Votos registrados */}
      {votes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Votos</p>
          {votes.map((v) => (
            <div
              key={v.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3",
                v.voto === "go"   ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
              )}
            >
              {v.voto === "go"
                ? <ThumbsUp  className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                : <ThumbsDown className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {RDM_GONOGO_PAPEL_LABELS[v.papel as RdmGoNogoPapel] ?? v.papel}
                  <span className={cn(
                    "ml-2 font-bold",
                    v.voto === "go" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {v.voto.toUpperCase()}
                  </span>
                </p>
                {v.justificativa && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{v.justificativa}"</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(v.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de voto */}
      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registrar voto</p>

        {/* Papel */}
        <div className="flex flex-wrap gap-1.5">
          {RDM_GONOGO_PAPEL.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPapel(p)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                selectedPapel === p
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {RDM_GONOGO_PAPEL_LABELS[p]}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Justificativa (opcional)…"
          rows={2}
          className="resize-none text-sm"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            disabled={submitting}
            onClick={() => handleVote("go")}
          >
            <ThumbsUp className="h-4 w-4" /> GO
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
            disabled={submitting}
            onClick={() => handleVote("nogo")}
          >
            <ThumbsDown className="h-4 w-4" /> NO-GO
          </Button>
        </div>
      </div>
    </div>
  );
}
