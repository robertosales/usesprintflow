import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2, AlertCircle, User } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn }       from "@/lib/utils";
import { useAuth }  from "@/contexts/AuthContext";
import { useRdmGoNogo } from "../hooks/useRdmGoNogo";
import { toast } from "sonner";

// Papeis alinhados com o CHECK do banco:
// CHECK (papel IN ('arquiteto','product_owner','ad'))
const PAPEIS = [
  { value: "arquiteto",     label: "Arquiteto" },
  { value: "product_owner", label: "Product Owner" },
  { value: "ad",            label: "AD" },
] as const;

// Valor do enum do banco: 'go' | 'no_go'
const DECISAO_LABELS: Record<string, string> = {
  go:    "GO",
  no_go: "NO-GO",
};

interface Props { rdmId: string }

export function RdmGoNogoPanel({ rdmId }: Props) {
  const { profile }  = useAuth();
  const { votes, loading, error, totalGo, totalNogo, consensus, vote } =
    useRdmGoNogo(rdmId);

  const [selectedPapel, setSelectedPapel] = useState<string>("arquiteto");
  const [justificativa, setJustificativa]  = useState("");
  const [submitting, setSubmitting]        = useState(false);

  const handleVote = async (decisao: "go" | "no_go") => {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      await vote({
        rdm_id:        rdmId,
        profile_id:    profile.id,
        papel:         selectedPapel,
        decisao,
        justificativa: justificativa.trim() || null,
      });
      setJustificativa("");
      toast.success(decisao === "go" ? "✅ Voto GO registrado." : "🚫 Voto NO-GO registrado.");
    } catch (e: any) {
      toast.error("Erro ao registrar voto: " + (e?.message ?? ""));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-destructive text-sm py-6 justify-center">
      <AlertCircle className="h-4 w-4" /> {error}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Consenso */}
      <div className={cn(
        "rounded-xl border p-4 flex items-center gap-4",
        consensus === "go"      && "border-emerald-500/30 bg-emerald-500/10",
        consensus === "no_go"  && "border-red-500/30 bg-red-500/10",
        consensus === "pendente" && "border-border bg-muted/30",
      )}>
        {consensus === "go"      && <ThumbsUp    className="h-8 w-8 text-emerald-400 shrink-0" />}
        {consensus === "no_go"  && <ThumbsDown  className="h-8 w-8 text-red-400 shrink-0" />}
        {consensus === "pendente" && <AlertCircle className="h-8 w-8 text-muted-foreground shrink-0" />}
        <div>
          <p className="text-sm font-bold text-foreground">
            {consensus === "go"      && "✅ Consenso: GO"}
            {consensus === "no_go"  && "🚫 Consenso: NO-GO"}
            {consensus === "pendente" && "⏳ Aguardando votos"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalGo} GO &nbsp;·&nbsp; {totalNogo} NO-GO &nbsp;·&nbsp;{" "}
            {votes.length} voto{votes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Lista de votos */}
      {votes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Votos</p>
          {votes.map((v) => (
            <div key={v.id} className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              v.decisao === "go"
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-red-500/20 bg-red-500/5"
            )}>
              {v.decisao === "go"
                ? <ThumbsUp   className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                : <ThumbsDown className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    {PAPEIS.find((p) => p.value === v.papel)?.label ?? v.papel}
                  </span>
                  <span className={cn(
                    "text-xs font-bold",
                    v.decisao === "go" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {DECISAO_LABELS[v.decisao] ?? v.decisao.toUpperCase()}
                  </span>
                </div>
                {v.justificativa && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    "{v.justificativa}"
                  </p>
                )}
                {v.comentario && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {v.comentario}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <User className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground/60 font-mono"
                    title={v.profile_id}>
                    {v.profile_id.slice(0, 8)}…
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">·</span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(v.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário */}
      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registrar voto</p>

        {/* Seleção de papel */}
        <div className="flex flex-wrap gap-1.5">
          {PAPEIS.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelectedPapel(p.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                selectedPapel === p.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
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
            variant="outline" size="sm"
            className="flex-1 gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            disabled={submitting || !profile?.id}
            onClick={() => handleVote("go")}
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ThumbsUp className="h-4 w-4" />}
            GO
          </Button>
          <Button
            variant="outline" size="sm"
            className="flex-1 gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
            disabled={submitting || !profile?.id}
            onClick={() => handleVote("no_go")}
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ThumbsDown className="h-4 w-4" />}
            NO-GO
          </Button>
        </div>

        {!profile?.id && (
          <p className="text-xs text-muted-foreground text-center">
            Faça login para registrar seu voto.
          </p>
        )}
      </div>
    </div>
  );
}
