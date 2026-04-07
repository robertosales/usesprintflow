import { useState, useEffect, useMemo, useCallback } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SizeBadge } from "@/components/SizeBadge";
import { SizeSelector } from "@/components/SizeSelector";
import { SIZE_REFERENCES, FIBONACCI_DECK, getSizeByKey, getSizeByPoints, type SizeReference } from "@/lib/sizeReference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search, Play, RotateCcw, ChevronLeft, ChevronRight, Check, Settings, Users, Copy,
  Eye, EyeOff, Clock, Coffee, Infinity, HelpCircle
} from "lucide-react";
import type { UserStory } from "@/types/sprint";

type DeckMode = "fibonacci" | "hours" | "custom";
type VotingStatus = "pending" | "voting" | "voted";

interface PlanningSession {
  id: string;
  deckMode: DeckMode;
  deckConfig: any;
  status: string;
}

interface Vote {
  id: string;
  huId: string;
  userId: string;
  voteValue: string;
  revealed: boolean;
}

export function PlanningPoker() {
  const { userStories, activeSprint, sprints, updateUserStory, refreshAll } = useSprint();
  const { currentTeamId, profile } = useAuth();

  const [session, setSession] = useState<PlanningSession | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentHuId, setCurrentHuId] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deckConfigOpen, setDeckConfigOpen] = useState(false);
  const [deckMode, setDeckMode] = useState<DeckMode>("fibonacci");
  const [customCards, setCustomCards] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [hoursConfig, setHoursConfig] = useState(SIZE_REFERENCES.map(s => ({ ...s })));

  const userId = profile?.user_id;

  const sprintStories = useMemo(() => {
    if (!activeSprint) return [];
    return userStories.filter(hu => hu.sprintId === activeSprint.id);
  }, [activeSprint, userStories]);

  const categorizedStories = useMemo(() => {
    const pending: UserStory[] = [];
    const voting: UserStory[] = [];
    const voted: UserStory[] = [];

    sprintStories.forEach(hu => {
      if (hu.id === currentHuId) {
        voting.push(hu);
      } else if (hu.planningStatus === "voted" || hu.sizeReference) {
        voted.push(hu);
      } else {
        pending.push(hu);
      }
    });

    return { pending, voting, voted };
  }, [sprintStories, currentHuId]);

  const filteredPending = useMemo(() => {
    if (!searchTerm) return categorizedStories.pending;
    const q = searchTerm.toLowerCase();
    return categorizedStories.pending.filter(hu =>
      hu.title.toLowerCase().includes(q) || hu.code.toLowerCase().includes(q)
    );
  }, [categorizedStories.pending, searchTerm]);

  const loadSession = useCallback(async () => {
    if (!currentTeamId || !activeSprint) return;
    const { data } = await supabase
      .from("planning_sessions")
      .select("*")
      .eq("team_id", currentTeamId)
      .eq("sprint_id", activeSprint.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const s = data[0];
      setSession({
        id: s.id,
        deckMode: s.deck_mode as DeckMode,
        deckConfig: s.deck_config,
        status: s.status,
      });
      setDeckMode(s.deck_mode as DeckMode);
      if (s.deck_config && Array.isArray(s.deck_config)) {
        setCustomCards(s.deck_config as string[]);
      }
    }
  }, [currentTeamId, activeSprint]);

  const loadVotes = useCallback(async () => {
    if (!session || !currentHuId) return;
    const { data } = await supabase
      .from("planning_votes")
      .select("*")
      .eq("session_id", session.id)
      .eq("hu_id", currentHuId);

    if (data) {
      setVotes(data.map((v: any) => ({
        id: v.id, huId: v.hu_id, userId: v.user_id,
        voteValue: v.vote_value, revealed: v.revealed,
      })));
      const mine = data.find((v: any) => v.user_id === userId);
      setMyVote(mine?.vote_value || null);
      setRevealed(data.every((v: any) => v.revealed));
    }
  }, [session, currentHuId, userId]);

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { loadVotes(); }, [loadVotes]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`planning-votes-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'planning_votes',
        filter: `session_id=eq.${session.id}`,
      }, () => { loadVotes(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, loadVotes]);

  const startSession = async () => {
    if (!currentTeamId || !activeSprint || !userId) return;
    const config = deckMode === "custom" ? customCards : [];
    const { data, error } = await supabase.from("planning_sessions").insert({
      team_id: currentTeamId,
      sprint_id: activeSprint.id,
      deck_mode: deckMode,
      deck_config: config,
      created_by: userId,
    }).select().single();

    if (error) { toast.error("Erro ao iniciar sessão"); return; }
    setSession({
      id: data.id, deckMode: data.deck_mode as DeckMode,
      deckConfig: data.deck_config, status: data.status,
    });
    const firstPending = sprintStories.find(hu => hu.planningStatus !== "voted" && !hu.sizeReference);
    if (firstPending) setCurrentHuId(firstPending.id);
    setDeckConfigOpen(false);
    toast.success("Sessão iniciada!");
  };

  const castVote = async (value: string) => {
    if (!session || !currentHuId || !userId) return;
    await supabase.from("planning_votes")
      .delete()
      .eq("session_id", session.id)
      .eq("hu_id", currentHuId)
      .eq("user_id", userId);
    await supabase.from("planning_votes").insert({
      session_id: session.id,
      hu_id: currentHuId,
      user_id: userId,
      vote_value: value,
      revealed: false,
    });
    setMyVote(value);
  };

  const revealVotes = async () => {
    if (!session || !currentHuId) return;
    await supabase.from("planning_votes")
      .update({ revealed: true })
      .eq("session_id", session.id)
      .eq("hu_id", currentHuId);
    setRevealed(true);
  };

  const revote = async () => {
    if (!session || !currentHuId) return;
    await supabase.from("planning_votes")
      .delete()
      .eq("session_id", session.id)
      .eq("hu_id", currentHuId);
    setVotes([]);
    setMyVote(null);
    setRevealed(false);
    toast.info("Nova rodada de votação");
  };

  const confirmAndAdvance = async (sizeKey: string) => {
    if (!currentHuId || !userId) return;
    const size = getSizeByKey(sizeKey);
    if (!size) return;

    await updateUserStory(currentHuId, {
      storyPoints: size.points,
      sizeReference: size.key,
      estimatedHours: size.hours,
      planningStatus: "voted",
      votedAt: new Date().toISOString(),
      votedBy: userId,
    } as any);

    toast.success(`HU confirmada: ${size.label} — ${size.hours}h`);

    const nextPending = sprintStories.find(hu =>
      hu.id !== currentHuId && hu.planningStatus !== "voted" && !hu.sizeReference
    );
    setCurrentHuId(nextPending?.id || null);
    setMyVote(null);
    setVotes([]);
    setRevealed(false);
    await refreshAll();
  };

  const endSession = async () => {
    if (!session) return;
    await supabase.from("planning_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", session.id);
    setSession(null);
    setCurrentHuId(null);
    toast.success("Sessão encerrada!");
  };

  const getDeckCards = (): string[] => {
    if (deckMode === "fibonacci") return FIBONACCI_DECK;
    if (deckMode === "hours") return SIZE_REFERENCES.map(s => s.key);
    return customCards;
  };

  const getConsensus = (): { size: SizeReference | null; counts: Record<string, number> } => {
    const counts: Record<string, number> = {};
    const numericVotes: number[] = [];

    votes.forEach(v => {
      counts[v.voteValue] = (counts[v.voteValue] || 0) + 1;
      const num = parseFloat(v.voteValue === "½" ? "0.5" : v.voteValue);
      if (!isNaN(num)) numericVotes.push(num);
    });

    if (numericVotes.length === 0) return { size: null, counts };

    const uniqueValues = [...new Set(votes.map(v => v.voteValue))];
    if (uniqueValues.length === 1) {
      if (deckMode === "hours") {
        return { size: getSizeByKey(uniqueValues[0]) || null, counts };
      }
      const avg = numericVotes[0];
      return { size: getSizeByPoints(avg) || null, counts };
    }

    numericVotes.sort((a, b) => a - b);
    const mid = Math.floor(numericVotes.length / 2);
    const median = numericVotes.length % 2 !== 0
      ? numericVotes[mid]
      : (numericVotes[mid - 1] + numericVotes[mid]) / 2;

    return { size: getSizeByPoints(median) || null, counts };
  };

  const currentHu = currentHuId ? sprintStories.find(hu => hu.id === currentHuId) : null;
  const consensus = revealed ? getConsensus() : null;
  const votedCount = categorizedStories.voted.length;
  const pendingCount = categorizedStories.pending.length;
  const votingCount = currentHuId ? 1 : 0;

  const cardDisplayValue = (val: string) => {
    if (val === "☕") return <Coffee className="h-5 w-5" />;
    if (val === "∞") return <Infinity className="h-5 w-5" />;
    if (val === "?") return <HelpCircle className="h-5 w-5" />;
    return val;
  };

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Settings className="h-14 w-14 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground font-medium">Ative uma Sprint para usar o Planning Poker</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" /> Planning Poker
            </h2>
            <p className="text-sm text-muted-foreground">{activeSprint.name} · {sprintStories.length} HUs</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurar Baralho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {([
                { mode: "fibonacci" as DeckMode, label: "Fibonacci", desc: "0, ½, 1, 2, 3, 5, 8, 13, 21..." },
                { mode: "hours" as DeckMode, label: "Referência em Horas", desc: "P→4h, M→6h, G→12h, GG→16h, XG→24h" },
                { mode: "custom" as DeckMode, label: "Customizado", desc: "Crie seu próprio baralho" },
              ]).map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDeckMode(mode)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-all",
                    deckMode === mode
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>

            {deckMode === "fibonacci" && (
              <div className="flex flex-wrap gap-2">
                {FIBONACCI_DECK.map(card => (
                  <div key={card} className="flex items-center justify-center h-12 w-12 rounded-lg border bg-card text-sm font-bold">
                    {cardDisplayValue(card)}
                  </div>
                ))}
              </div>
            )}

            {deckMode === "hours" && (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium text-muted-foreground">
                  <span>Tamanho</span><span>Pontos</span><span>Horas</span><span></span><span></span>
                </div>
                {hoursConfig.map((s, i) => (
                  <div key={s.key} className="grid grid-cols-5 gap-2 items-center">
                    <Input value={s.key} readOnly className="h-8 text-xs text-center font-bold" />
                    <Input value={s.pointsLabel} readOnly className="h-8 text-xs text-center" />
                    <Input
                      type="number" value={s.hours}
                      onChange={e => {
                        const c = [...hoursConfig];
                        c[i] = { ...c[i], hours: Number(e.target.value) };
                        setHoursConfig(c);
                      }}
                      className="h-8 text-xs text-center"
                    />
                    <span className="text-xs text-muted-foreground text-center">{s.label}</span>
                    <span></span>
                  </div>
                ))}
              </div>
            )}

            {deckMode === "custom" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && customInput.trim()) {
                        setCustomCards([...customCards, customInput.trim()]);
                        setCustomInput("");
                      }
                    }}
                    placeholder="Adicione um valor e pressione Enter"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {customCards.map((card, i) => (
                    <Badge key={i} variant="secondary" className="text-sm gap-1 cursor-pointer" onClick={() => setCustomCards(customCards.filter((_, j) => j !== i))}>
                      {card} ✕
                    </Badge>
                  ))}
                </div>
                {customCards.length < 2 && (
                  <p className="text-xs text-muted-foreground">Mínimo 2 cartas necessárias</p>
                )}
              </div>
            )}

            <Separator />

            <div className="flex justify-end gap-3">
              <Button
                onClick={startSession}
                disabled={deckMode === "custom" && customCards.length < 2}
                className="gap-2"
              >
                <Play className="h-4 w-4" /> Salvar e Iniciar Sessão
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" /> Planning Poker
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeSprint.name} · {sprintStories.length} HUs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-success/15 text-success border border-success/30 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Sessão Ativa
          </Badge>
          <Button variant="outline" size="sm" onClick={endSession}>Encerrar Sessão</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar HU..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2 pr-2">
              {categorizedStories.voting.map(hu => (
                <Card key={hu.id} className="border-warning/50 bg-warning/5 cursor-pointer" onClick={() => setCurrentHuId(hu.id)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px]">{hu.code}</Badge>
                      <Badge className="bg-warning/15 text-warning border border-warning/30 text-[10px] gap-1">
                        <Clock className="h-2.5 w-2.5" /> Votando
                      </Badge>
                    </div>
                    <p className="text-xs font-medium line-clamp-2">{hu.title}</p>
                  </CardContent>
                </Card>
              ))}

              {filteredPending.map(hu => (
                <Card
                  key={hu.id}
                  className={cn("cursor-pointer hover:shadow-sm transition-shadow", currentHuId === hu.id && "ring-2 ring-primary")}
                  onClick={() => { setCurrentHuId(hu.id); setMyVote(null); setVotes([]); setRevealed(false); }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px]">{hu.code}</Badge>
                      <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                    </div>
                    <p className="text-xs font-medium line-clamp-2">{hu.title}</p>
                  </CardContent>
                </Card>
              ))}

              {categorizedStories.voted.map(hu => (
                <Card key={hu.id} className="border-success/50 bg-success/5 opacity-75">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px]">{hu.code}</Badge>
                      <SizeBadge sizeReference={hu.sizeReference} storyPoints={hu.storyPoints} />
                      <Badge className="bg-success/15 text-success border border-success/30 text-[10px] gap-1">
                        <Check className="h-2.5 w-2.5" /> Votado
                      </Badge>
                    </div>
                    <p className="text-xs font-medium line-clamp-2">{hu.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="col-span-8 space-y-4">
          {currentHu ? (
            <>
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-xs font-semibold text-warning uppercase">Em votação agora</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">{currentHu.code}</Badge>
                    <h3 className="text-sm font-bold">{currentHu.title}</h3>
                  </div>
                  {currentHu.description && (
                    <p className="text-xs text-muted-foreground mt-1">{currentHu.description}</p>
                  )}
                </CardContent>
              </Card>

              {votes.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Votos ({votes.length})</span>
                      {!revealed && (
                        <Button size="sm" variant="outline" onClick={revealVotes} className="gap-1 text-xs">
                          <Eye className="h-3 w-3" /> Revelar todos
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {votes.map(v => (
                        <div key={v.id} className="flex flex-col items-center gap-1">
                          <div className={cn(
                            "h-14 w-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all",
                            revealed
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-muted bg-muted text-muted-foreground"
                          )}>
                            {revealed ? cardDisplayValue(v.voteValue) : <EyeOff className="h-4 w-4" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                            {v.userId === userId ? "Você" : "Participante"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {revealed && consensus?.size && (
                      <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/30">
                        <p className="text-sm font-bold text-success">
                          Consenso: {consensus.size.label} — {consensus.size.hours}h
                        </p>
                        <div className="flex gap-2 mt-1">
                          {Object.entries(consensus.counts).map(([val, count]) => (
                            <Badge key={val} variant="outline" className="text-[10px]">
                              {val} × {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Escolha sua carta</p>
                  <div className="flex flex-wrap gap-2">
                    {getDeckCards().map(card => (
                      <button
                        key={card}
                        type="button"
                        onClick={() => castVote(card)}
                        className={cn(
                          "h-16 w-12 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all cursor-pointer",
                          myVote === card
                            ? "border-primary bg-primary text-primary-foreground shadow-md scale-105"
                            : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                        )}
                      >
                        {cardDisplayValue(card)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Play className="h-14 w-14 text-muted-foreground/30" />
              <p className="text-lg text-muted-foreground font-medium">Selecione uma HU para iniciar a votação</p>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-3 -mx-4 md:-mx-6 px-4 md:px-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-success" /> {votedCount} votadas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-warning" /> {votingCount} em andamento
            </span>
            <span className="flex items-center gap-1">
              ○ {pendingCount} pendentes
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentHuId && revealed && (
              <>
                <Button variant="outline" size="sm" onClick={revote} className="gap-1 text-xs">
                  <RotateCcw className="h-3 w-3" /> Revotar
                </Button>
                {consensus?.size && (
                  <Button size="sm" onClick={() => confirmAndAdvance(consensus.size!.key)} className="gap-1 text-xs">
                    <Check className="h-3 w-3" /> Confirmar {consensus.size.label} e avançar
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
