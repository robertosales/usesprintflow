import { useState } from "react";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useRdmParticipantes } from "../hooks/useRdmParticipantes";
import { useAuth }             from "@/contexts/AuthContext";

const PAPEIS_PARTICIPANTE = [
  { value: "executor",      label: "Executor" },
  { value: "aprovador",     label: "Aprovador" },
  { value: "testador",      label: "Testador" },
  { value: "comunicacao",   label: "Comunicação" },
  { value: "observador",    label: "Observador" },
] as const;

interface Props { rdmId: string }

export function RdmParticipantesPanel({ rdmId }: Props) {
  const { profile } = useAuth();
  const { participantes, loading, add, remove } = useRdmParticipantes(rdmId);
  const [papel, setPapel]             = useState("executor");
  const [nome, setNome]               = useState("");
  const [contato, setContato]         = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [removingId, setRemovingId]   = useState<string | null>(null);

  const handleAdd = async () => {
    if (!nome.trim()) return;
    setSubmitting(true);
    try {
      await add({
        rdm_id:      rdmId,
        profile_id:  profile?.id ?? null,
        papel,
        nome_externo: nome.trim(),
        contato:     contato.trim() || null,
      });
      setNome("");
      setContato("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try { await remove(id); } finally { setRemovingId(null); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Lista */}
      {participantes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
          <Users className="h-10 w-10 opacity-25" />
          <p className="text-sm">Nenhum participante cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {participantes.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {p.nome_externo ?? "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {PAPEIS_PARTICIPANTE.find((r) => r.value === p.papel)?.label ?? p.papel}
                  {p.contato && <> · {p.contato}</>}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                disabled={removingId === p.id}
                onClick={() => handleRemove(p.id)}
              >
                {removingId === p.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2  className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de adição */}
      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adicionar participante</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome *</Label>
            <Input
              placeholder="Nome completo ou identificador"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Papel *</Label>
            <Select value={papel} onValueChange={setPapel}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAPEIS_PARTICIPANTE.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Contato (e-mail / ramal)</Label>
          <Input
            placeholder="ex.: joao@empresa.com"
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={submitting || !nome.trim()}
          className="gap-1.5 w-full sm:w-auto"
        >
          {submitting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus    className="h-4 w-4" />}
          Adicionar
        </Button>
      </div>
    </div>
  );
}
