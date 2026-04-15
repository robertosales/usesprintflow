import { useState, useEffect, useMemo, useCallback } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Check, ChevronRight, Play,
  BookOpen, Zap, AlertTriangle, XCircle, Trophy
} from "lucide-react";

// ─── Models (PT-BR) ───
const RETRO_MODELS = {
  "4ls": {
    label: "4Ls",
    columns: [
      { key: "liked", label: "Gostamos", icon: "👍", desc: "O que gostamos", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
      { key: "learned", label: "Aprendemos", icon: "📚", desc: "O que aprendemos", color: "text-info", bg: "bg-info/10", border: "border-info/30" },
      { key: "lacked", label: "Faltou", icon: "😕", desc: "O que faltou", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
      { key: "longed_for", label: "Ações", icon: "⚡", desc: "O que desejamos", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
    ],
  },
  start_stop_continue: {
    label: "Iniciar / Parar / Continuar",
    columns: [
      { key: "start", label: "Iniciar", icon: "🟢", desc: "Começar a fazer", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
      { key: "stop", label: "Parar", icon: "🔴", desc: "Parar de fazer", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
      { key: "continue", label: "Continuar", icon: "🔵", desc: "Continuar fazendo", color: "text-info", bg: "bg-info/10", border: "border-info/30" },
    ],
  },
  mad_sad_glad: {
    label: "Frustrado / Triste / Feliz",
    columns: [
      { key: "mad", label: "Frustrado", icon: "😡", desc: "Nos irritou", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
      { key: "sad", label: "Triste", icon: "😢", desc: "Nos entristeceu", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
      { key: "glad", label: "Feliz", icon: "😊", desc: "Nos alegrou", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
    ],
  },
  starfish: {
    label: "Estrela do Mar",
    columns: [
      { key: "more", label: "Mais", icon: "➕", desc: "Fazer mais", color: "text-accent-foreground", bg: "bg-accent/10", border: "border-accent/30" },
      { key: "less", label: "Menos", icon: "➖", desc: "Fazer menos", color: "text-accent-foreground", bg: "bg-accent/10", border: "border-accent/30" },
      { key: "start_sf", label: "Iniciar", icon: "🟢", desc: "Começar", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
      { key: "stop_sf", label: "Parar", icon: "🔴", desc: "Parar", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
      { key: "keep", label: "Manter", icon: "⭐", desc: "Manter", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
    ],
  },
  kpt: {
    label: "KPT",
    columns: [
      { key: "keep_kpt", label: "Manter", icon: "✅", desc: "Manter", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
      { key: "problem", label: "Problema", icon: "⚠️", desc: "Problemas", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
      { key: "try", label: "Experimentar", icon: "💡", desc: "Tentar", color: "text-info", bg: "bg-info/10", border: "border-info/30" },
    ],
  },
};

type ModelKey = keyof typeof RETRO_MODELS;

const STEPS = [
  { key: "sprint", label: "Sprint" },
  { key: "model", label: "Modelo" },
  { key: "collect", label: "Coletar Cards" },
  { key: "vote", label: "Agrupar e Votar" },
  { key: "actions", label: "Ações" },
  { key: "report", label: "Relatório" },
];

interface RetroCard {
  id: string; sessionId: string; columnKey: string; text: string;
  authorId: string; isAction: boolean; votes: number;
  actionOwnerId?: string | null; actionTargetSprintId?: string | null;
}
interface RetroAction {
  id: string; sessionId: string; cardId?: string | null;
  description: string; ownerId?: string | null;
  targetSprintId?: string | null; status: string;
}
interface RetroSession {
  id: string; sprintId: string; model: ModelKey; status: string; createdBy: string;
}

export function RetroManager() {
  const { activeSprint, sprints, userStories, impediments } = useSprint();
  const { currentTeamId, profile } = useAuth();
  const userId = profile?.user_id;

  const [step, setStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("4ls");
  const [session, setSession] = useState<RetroSession | null>(null);
  const [cards, setCards] = useState<RetroCard[]>([]);
  const [actions, setActions] = useState<RetroAction[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newActionText, setNewActionText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isHost = session?.createdBy === userId;
  const model = RETRO_MODELS[session?.model || selectedModel];

  // Top 3 cards by votes
  const top3Cards = useMemo(() => {
    return [...cards].sort((a, b) => b.votes - a.votes).filter(c => c.votes > 0).slice(0, 3);
  }, [cards]);

  const loadSession = useCallback(async () => {
    if (!currentTeamId || !activeSprint) return;
    const { data } = await supabase
      .from("retro_sessions").select("*")
      .eq("team_id", currentTeamId).eq("sprint_id", activeSprint.id)
      .order("created_at", { ascending: false }).limit(1);

    if (data && data.length > 0) {
      const s = data[0];
      setSession({ id: s.id, sprintId: s.sprint_id, model: s.model as ModelKey, status: s.status, createdBy: s.created_by });
      setSelectedModel(s.model as ModelKey);
      if (s.status === "active") setStep(2);
      else setStep(5);
    }
  }, [currentTeamId, activeSprint]);

  const loadCards = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from("retro_cards").select("*").eq("session_id", session.id).order("created_at");
    if (data) {
      setCards(data.map((c: any) => ({
        id: c.id, sessionId: c.session_id, columnKey: c.column_key,
        text: c.text, authorId: c.author_id, isAction: c.is_action,
        votes: c.votes, actionOwnerId: c.action_owner_id,
        actionTargetSprintId: c.action_target_sprint_id,
      })));
    }
  }, [session]);

  const loadActions = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from("retro_actions").select("*").eq("session_id", session.id).order("created_at");
    if (data) {
      setActions(data.map((a: any) => ({
        id: a.id, sessionId: a.session_id, cardId: a.card_id,
        description: a.description, ownerId: a.owner_id,
        targetSprintId: a.target_sprint_id, status: a.status,
      })));
    }
  }, [session]);

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { loadCards(); loadActions(); }, [loadCards, loadActions]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`retro-cards-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retro_cards', filter: `session_id=eq.${session.id}` }, () => loadCards())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, loadCards]);

  const startSession = async () => {
    if (!currentTeamId || !activeSprint || !userId) return;
    const { data, error } = await supabase.from("retro_sessions").insert({
      team_id: currentTeamId, sprint_id: activeSprint.id,
      model: selectedModel, created_by: userId,
    }).select().single();
    if (error) { toast.error("Erro ao criar sessão"); return; }
    setSession({ id: data.id, sprintId: data.sprint_id, model: data.model as ModelKey, status: data.status, createdBy: data.created_by });
    setStep(2);
    toast.success("Sessão de retrospectiva iniciada!");
  };

  const addCard = async (columnKey: string) => {
    if (!session || !userId || !newCardText.trim()) return;
    const { error } = await supabase.from("retro_cards").insert({
      session_id: session.id, column_key: columnKey,
      text: newCardText.trim(), author_id: userId,
    });
    if (error) { toast.error("Erro ao adicionar card"); return; }
    setNewCardText(""); setAddingTo(null);
    await loadCards();
  };

  const updateCard = async (id: string, updates: any) => {
    await supabase.from("retro_cards").update(updates).eq("id", id);
    await loadCards();
  };

  const deleteCard = async (id: string) => {
    await supabase.from("retro_cards").delete().eq("id", id);
    await loadCards();
  };

  const voteCard = async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    await supabase.from("retro_cards").update({ votes: card.votes + 1 }).eq("id", id);
    await loadCards();
  };

  const convertToAction = async (card: RetroCard) => {
    await supabase.from("retro_cards").update({ is_action: true }).eq("id", card.id);
    await supabase.from("retro_actions").insert({
      session_id: session!.id, card_id: card.id,
      description: card.text, status: "pendente",
    });
    await loadCards(); await loadActions();
    toast.success("Card convertido em ação");
  };

  const addAction = async () => {
    if (!session || !newActionText.trim()) return;
    await supabase.from("retro_actions").insert({
      session_id: session.id, description: newActionText.trim(), status: "pendente",
    });
    setNewActionText(""); await loadActions();
  };

  const updateAction = async (id: string, updates: any) => {
    await supabase.from("retro_actions").update(updates).eq("id", id);
    await loadActions();
  };

  const finalize = async () => {
    if (!session) return;
    await supabase.from("retro_sessions").update({
      status: "finished", finished_at: new Date().toISOString(),
    }).eq("id", session.id);
    setSession({ ...session, status: "finished" });
    toast.success("Retrospectiva finalizada!");
    setReportOpen(false);
  };

  const cancelSession = async () => {
    if (!session) return;
    setCancelling(true);
    try {
      await supabase.from("retro_actions").delete().eq("session_id", session.id);
      await supabase.from("retro_cards").delete().eq("session_id", session.id);
      await supabase.from("retro_sessions").update({
        status: "cancelled", finished_at: new Date().toISOString(),
      }).eq("id", session.id);
      setSession(null); setCards([]); setActions([]); setStep(0);
      setCancelOpen(false);
      toast.success("Sessão cancelada. Todos os cards e ações foram descartados.");
    } catch {
      toast.error("Erro ao cancelar sessão");
    } finally {
      setCancelling(false);
    }
  };

  const sprintStories = activeSprint ? userStories.filter(hu => hu.sprintId === activeSprint.id) : [];
  const completedStories = sprintStories.filter(hu => hu.status === "pronto_para_publicacao");
  const activeImpediments = impediments.filter(i => !i.resolvedAt);

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <BookOpen className="h-14 w-14 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground font-medium">Ative uma Sprint para iniciar a Retrospectiva</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Retrospectiva
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeSprint.name} · Modelo: {model.label}
            {session && session.status === "active" && (
              <Badge className="bg-success/15 text-success border border-success/30 gap-1 ml-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Sessão Ativa
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session && session.status === "active" && (
            <CountdownTimer isFacilitator={isHost} />
          )}
          {session && session.status === "active" && step >= 2 && (
            <Button onClick={() => { setStep(5); setReportOpen(true); }} className="gap-1">
              Finalizar e ver Relatório <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {session && session.status === "active" && isHost && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar Sessão
            </Button>
          )}
        </div>
      </div>

      {/* Step bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <button key={s.key} type="button"
            onClick={() => { if (session || i < 2) setStep(i); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              i < step ? "bg-success/15 text-success" :
              i === step ? "bg-primary/10 text-primary border border-primary/30" :
              "bg-muted text-muted-foreground"
            )}>
            {i < step ? <Check className="h-3 w-3" /> : <span className="h-4 w-4 flex items-center justify-center text-[10px] rounded-full border">{i + 1}</span>}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step 0 - Sprint */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Selecionar Sprint</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Sprint</Label><p className="text-sm font-medium">{activeSprint.name}</p></div>
              <div><Label className="text-xs text-muted-foreground">Período</Label><p className="text-sm">{new Date(activeSprint.startDate).toLocaleDateString("pt-BR")} — {new Date(activeSprint.endDate).toLocaleDateString("pt-BR")}</p></div>
              <div><Label className="text-xs text-muted-foreground">HUs Concluídas</Label><p className="text-sm font-medium">{completedStories.length} / {sprintStories.length}</p></div>
              <div><Label className="text-xs text-muted-foreground">Impedimentos Ativos</Label><p className="text-sm font-medium">{activeImpediments.length}</p></div>
            </div>
            <Button onClick={() => setStep(1)} className="gap-1">Próximo <ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1 - Model */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Escolha o modelo</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.entries(RETRO_MODELS) as [ModelKey, typeof RETRO_MODELS[ModelKey]][]).map(([key, m]) => (
              <button key={key} type="button" onClick={() => setSelectedModel(key)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all",
                  selectedModel === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}>
                <span className="text-sm font-bold">{m.label}</span>
                <div className="flex flex-wrap gap-1">
                  {m.columns.map(col => (
                    <Badge key={col.key} variant="secondary" className="text-[10px]">{col.icon} {col.label}</Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
          <Button onClick={startSession} className="gap-1">
            <Play className="h-4 w-4" /> Iniciar Sessão
          </Button>
        </div>
      )}

      {/* Step 2 - Collect Cards */}
      {step === 2 && session && (
        <div className={cn("grid gap-3", model.columns.length <= 3 ? "grid-cols-3" : model.columns.length === 4 ? "grid-cols-4" : "grid-cols-5")}
             style={{ height: "calc(100vh - 300px)" }}>
          {model.columns.map(col => {
            const colCards = cards.filter(c => c.columnKey === col.key);
            return (
              <div key={col.key} className="flex flex-col min-w-[180px]">
                <div className={cn("rounded-t-lg p-3 border", col.bg, col.border)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.icon}</span>
                    <div>
                      <p className={cn("text-xs font-bold", col.color)}>{col.label}</p>
                      <p className="text-[10px] text-muted-foreground">{col.desc}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{colCards.length}</Badge>
                  </div>
                </div>
                <div className={cn("rounded-b-lg border border-t-0 p-2 space-y-2 flex-1 overflow-y-auto", col.bg.replace("/10", "/5"))}>
                  {colCards.map(card => (
                    <div key={card.id} className={cn("rounded-lg border p-2.5 bg-card group relative", card.isAction && "border-warning/50 bg-warning/5")}>
                      {editingCard === card.id ? (
                        <div className="space-y-2">
                          <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} className="text-xs resize-none" />
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { updateCard(card.id, { text: editText }); setEditingCard(null); }}>Salvar</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingCard(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {card.isAction && <Badge className="bg-warning/15 text-warning border border-warning/30 text-[10px] mb-1">⚡ Ação</Badge>}
                          <p className="text-xs">{card.text}</p>
                          <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingCard(card.id); setEditText(card.text); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {!card.isAction && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-warning" onClick={() => convertToAction(card)}>
                                  <Zap className="h-3 w-3" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteCard(card.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {addingTo === col.key ? (
                    <div className="space-y-2">
                      <Textarea value={newCardText} onChange={e => setNewCardText(e.target.value)}
                        placeholder="Escreva seu card..." rows={2} className="text-xs resize-none" autoFocus />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-[10px]" onClick={() => addCard(col.key)}>Salvar</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setAddingTo(null); setNewCardText(""); }}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="w-full text-xs gap-1 text-muted-foreground" onClick={() => setAddingTo(col.key)}>
                      <Plus className="h-3 w-3" /> Adicionar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 3 - Vote */}
      {step === 3 && session && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Agrupar e Votar</h3>
          <p className="text-xs text-muted-foreground">Clique em 👍 para votar nos cards mais importantes</p>
          <div className={cn("grid gap-3", model.columns.length <= 3 ? "grid-cols-3" : "grid-cols-4")}>
            {model.columns.map(col => {
              const colCards = cards.filter(c => c.columnKey === col.key).sort((a, b) => b.votes - a.votes);
              return (
                <div key={col.key}>
                  <div className={cn("rounded-t-lg p-2 border text-center", col.bg, col.border)}>
                    <p className={cn("text-xs font-bold", col.color)}>{col.icon} {col.label}</p>
                  </div>
                  <div className="rounded-b-lg border border-t-0 p-2 space-y-2">
                    {colCards.map(card => (
                      <div key={card.id} className={cn("rounded-lg border p-2 flex items-start gap-2", card.votes > 0 && "border-primary/40")}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => voteCard(card.id)}>👍</Button>
                        <div className="flex-1"><p className="text-xs">{card.text}</p></div>
                        {card.votes > 0 && <Badge variant="secondary" className="text-[10px] shrink-0">{card.votes}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top 3 Ranking */}
          {top3Cards.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold text-warning uppercase">Top 3 — Ranking Automático</span>
                </div>
                <div className="space-y-2">
                  {top3Cards.map((card, i) => {
                    const col = model.columns.find(c => c.key === card.columnKey);
                    return (
                      <div key={card.id} className="flex items-center gap-3 rounded-lg border bg-card p-2">
                        <span className={cn("text-lg font-bold", i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : "text-muted-foreground/60")}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{card.text}</p>
                          <p className="text-[10px] text-muted-foreground">{col?.icon} {col?.label}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{card.votes} votos</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={() => setStep(4)} className="gap-1">Próximo <ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Step 4 - Actions */}
      {step === 4 && session && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Plano de Ações</h3>
          <div className="space-y-3">
            {actions.map(action => (
              <Card key={action.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Zap className="h-4 w-4 text-warning shrink-0" />
                  <div className="flex-1"><p className="text-sm">{action.description}</p></div>
                  <Select value={action.targetSprintId || ""} onValueChange={v => updateAction(action.id, { target_sprint_id: v || null })}>
                    <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Sprint alvo" /></SelectTrigger>
                    <SelectContent>
                      {sprints.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-[10px]">{action.status}</Badge>
                </CardContent>
              </Card>
            ))}
            <div className="flex gap-2">
              <Input value={newActionText} onChange={e => setNewActionText(e.target.value)}
                placeholder="Adicionar nova ação..." className="h-8 text-xs"
                onKeyDown={e => { if (e.key === "Enter") addAction(); }} />
              <Button size="sm" className="h-8" onClick={addAction} disabled={!newActionText.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Button onClick={() => { setStep(5); setReportOpen(true); }} className="gap-1">
            Ver Relatório <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 5 - Report */}
      {step === 5 && (
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Relatório da Retrospectiva</DialogTitle></DialogHeader>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {model.columns.map(col => {
                const count = cards.filter(c => c.columnKey === col.key).length;
                return (
                  <Card key={col.key} className={cn(col.bg, col.border, "border")}>
                    <CardContent className="p-3 text-center">
                      <span className="text-lg">{col.icon}</span>
                      <p className={cn("text-xs font-bold mt-1", col.color)}>{col.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Top 3 in report */}
            {top3Cards.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-warning" /> Top 3 Cards
                  </h3>
                  <div className="space-y-2">
                    {top3Cards.map((card, i) => {
                      const col = model.columns.find(c => c.key === card.columnKey);
                      return (
                        <div key={card.id} className="flex items-center gap-3 rounded-lg border p-2">
                          <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                          <div className="flex-1">
                            <p className="text-xs">{card.text}</p>
                            <p className="text-[10px] text-muted-foreground">{col?.icon} {col?.label}</p>
                          </div>
                          <Badge variant="secondary">{card.votes} votos</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-bold mb-2">Plano de Ações</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Ação</TableHead>
                    <TableHead className="text-xs">Sprint Alvo</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action, i) => (
                    <TableRow key={action.id}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell className="text-xs">{action.description}</TableCell>
                      <TableCell className="text-xs">{sprints.find(s => s.id === action.targetSprintId)?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{action.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {actions.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">Nenhuma ação registrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-bold mb-2">Todos os Cards</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Texto</TableHead>
                    <TableHead className="text-xs">Votos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map(card => {
                    const col = model.columns.find(c => c.key === card.columnKey);
                    return (
                      <TableRow key={card.id}>
                        <TableCell className="text-xs"><Badge variant="secondary" className="text-[10px]">{col?.icon} {col?.label}</Badge></TableCell>
                        <TableCell className="text-xs">{card.text}</TableCell>
                        <TableCell className="text-xs">{card.votes > 0 ? card.votes : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              {session?.status === "active" && (
                <Button onClick={finalize} className="gap-1">
                  <Check className="h-4 w-4" /> Finalizar Retrospectiva
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Session Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Cancelar sessão de Retrospectiva?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todos os cards e ações serão descartados. Não pode ser desfeito.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={cancelSession} disabled={cancelling} className="gap-1">
              {cancelling && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive-foreground" />}
              Sim, cancelar sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
