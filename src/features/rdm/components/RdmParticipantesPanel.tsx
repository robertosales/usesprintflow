import { useState } from "react";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Label }  from "@/components/ui/label";
import {
  Avatar, AvatarFallback, AvatarImage,
} from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRdmParticipantes } from "../hooks/useRdmParticipantes";
import { useAuth }             from "@/contexts/AuthContext";
import { toast }              from "sonner";

// Papeis alinhados com o CHECK do banco em rdm_participantes:
// CHECK (papel IN ('arquiteto','scrum_master','ad','desenvolvedor','product_owner','requisitos'))
const PAPEIS = [
  { value: "arquiteto",     label: "Arquiteto" },
  { value: "scrum_master",  label: "Scrum Master" },
  { value: "ad",            label: "AD" },
  { value: "desenvolvedor", label: "Desenvolvedor" },
  { value: "product_owner", label: "Product Owner" },
  { value: "requisitos",    label: "Requisitos" },
] as const;

const PAPEL_COLORS: Record<string, string> = {
  arquiteto:     "bg-purple-500/15 text-purple-400 border-purple-500/20",
  scrum_master:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ad:            "bg-orange-500/15 text-orange-400 border-orange-500/20",
  desenvolvedor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  product_owner: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  requisitos:    "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    return name.trim().split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  }
  if (email?.trim()) return email[0].toUpperCase();
  return "?";
}

interface Props { rdmId: string }

export function RdmParticipantesPanel({ rdmId }: Props) {
  const { profile } = useAuth();
  const { participantes, loading, add, remove } = useRdmParticipantes(rdmId);
  const [papel, setPapel]                 = useState<string>("desenvolvedor");
  const [submitting, setSubmitting]       = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving]           = useState(false);

  const handleAdd = async () => {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      await add({ rdm_id: rdmId, profile_id: profile.id, papel });
      toast.success("Participação registrada.");
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoveId) return;
    setRemoving(true);
    try {
      await remove(confirmRemoveId);
      toast.success("Participante removido.");
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? ""));
    } finally {
      setRemoving(false);
      setConfirmRemoveId(null);
    }
  };

  const confirmParticipante = participantes.find((p) => p.id === confirmRemoveId);
  const confirmName = confirmParticipante?.profile?.display_name
    ?? confirmParticipante?.profile?.email
    ?? confirmParticipante?.profile_id.slice(0, 8) + "…";

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5">

      {participantes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
          <Users className="h-10 w-10 opacity-25" />
          <p className="text-sm">Nenhum participante cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {participantes.map((p) => {
            const initials    = getInitials(p.profile?.display_name, p.profile?.email);
            const displayName = p.profile?.display_name?.trim()
              || p.profile?.email?.trim()
              || p.profile_id.slice(0, 8) + "…";
            const paperLabel  = PAPEIS.find((r) => r.value === p.papel)?.label ?? p.papel;

            return (
              <div key={p.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">

                {/* Avatar */}
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={p.profile?.avatar_url ?? undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="text-[11px] font-semibold bg-primary/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Dados */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  {p.profile?.email && (
                    <p className="text-[11px] text-muted-foreground truncate">{p.profile.email}</p>
                  )}
                </div>

                {/* Papel */}
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 shrink-0 ${PAPEL_COLORS[p.papel] ?? ""}`}
                >
                  {paperLabel}
                </Badge>

                {/* Remover */}
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setConfirmRemoveId(p.id)}
                  title="Remover participante"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário: adicionar-me */}
      <div className="flex items-end gap-3 rounded-xl border border-border p-4">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Meu papel nesta RDM</Label>
          <Select value={papel} onValueChange={setPapel}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAPEIS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={submitting}
          className="gap-1.5 h-8"
        >
          {submitting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus    className="h-4 w-4" />}
          Participar
        </Button>
      </div>

      {/* AlertDialog — confirmar remoção */}
      <AlertDialog
        open={!!confirmRemoveId}
        onOpenChange={(o) => !o && !removing && setConfirmRemoveId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Remover Participante
            </AlertDialogTitle>
            <AlertDialogDescription>
              Remover{" "}
              <span className="font-semibold text-foreground">{confirmName}</span>{" "}
              desta RDM? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={removing}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
