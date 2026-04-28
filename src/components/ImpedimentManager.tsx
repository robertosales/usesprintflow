import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createNotifications } from "@/features/notifications/services/notifications.service";
import { Impediment, IMPEDIMENT_TYPE_LABELS, IMPEDIMENT_CRITICALITY_LABELS, ImpedimentType, ImpedimentCriticality, hasActiveImpediment } from "@/types/sprint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert, ExternalLink, CheckCircle2, AlertTriangle, Clock, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ImpedimentDialogProps {
  huId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ImpedimentDialog({ huId, open, onClose }: ImpedimentDialogProps) {
  const { addImpediment, userStories } = useSprint();
  const { currentTeamId } = useAuth();
  const [reason, setReason] = useState("");
  const [type, setType] = useState<ImpedimentType>("tecnico");
  const [criticality, setCriticality] = useState<ImpedimentCriticality>("media");
  const [hasTicket, setHasTicket] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!reason.trim()) e.reason = "Descrição do impedimento é obrigatória";
    if (hasTicket && !ticketId.trim()) e.ticketId = "Número do chamado é obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!huId || !validate()) return;
    await addImpediment(huId, {
      reason: reason.trim(),
      type,
      criticality,
      hasTicket,
      ticketUrl: ticketUrl.trim() || undefined,
      ticketId: ticketId.trim() || undefined,
    });

    // Create notification for all team members
    if (currentTeamId) {
      const hu = userStories.find((h) => h.id === huId);
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", currentTeamId);
      if (members && members.length > 0) {
        const notifications = members.map((m: any) => ({
          user_id: m.user_id,
          team_id: currentTeamId,
          type: "impediment",
          title: `⚠️ Novo impedimento na ${hu?.code || "HU"}`,
          message: reason.trim().substring(0, 120),
          link_type: "user_story",
          link_id: huId,
        }));
        await createNotifications(notifications);
      }
    }

    toast.warning("Impedimento registrado!");
    resetAndClose();
  };

  const resetAndClose = () => {
    setReason(""); setType("tecnico"); setCriticality("media");
    setHasTicket(false); setTicketUrl(""); setTicketId("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Registrar Impedimento na HU
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Descrição <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: "" })); }}
              placeholder="Descreva detalhadamente o impedimento..."
              className="mt-1"
              rows={3}
            />
            {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Tipo <span className="text-destructive">*</span></Label>
              <Select value={type} onValueChange={(v) => setType(v as ImpedimentType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPEDIMENT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Criticidade <span className="text-destructive">*</span></Label>
              <Select value={criticality} onValueChange={(v) => setCriticality(v as ImpedimentCriticality)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPEDIMENT_CRITICALITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Chamado vinculado?
              </Label>
              <Switch checked={hasTicket} onCheckedChange={setHasTicket} />
            </div>
            {hasTicket && (
              <div className="space-y-3 pt-1">
                <div>
                  <Label className="text-sm">Número do chamado <span className="text-destructive">*</span></Label>
                  <Input
                    value={ticketId}
                    onChange={(e) => { setTicketId(e.target.value); setErrors((p) => ({ ...p, ticketId: "" })); }}
                    placeholder="Ex: INC-12345, #4567"
                    className="mt-1"
                  />
                  {errors.ticketId && <p className="text-xs text-destructive mt-1">{errors.ticketId}</p>}
                </div>
                <div>
                  <Label className="text-sm">Link (Redmine, Jira, ServiceNow...)</Label>
                  <Input
                    value={ticketUrl}
                    onChange={(e) => setTicketUrl(e.target.value)}
                    placeholder="https://redmine.empresa.com/issues/12345"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          <Button onClick={handleSubmit} className="w-full gap-2">
            <ShieldAlert className="h-4 w-4" />
            Registrar Impedimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImpedimentList() {
  const { userStories, developers, activities, resolveImpediment, activeSprint } = useSprint();
  const [resolutionDialog, setResolutionDialog] = useState<{ huId: string; impId: string } | null>(null);
  const [resolution, setResolution] = useState("");

  const sprintStories = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];

  const allImpediments: { hu: typeof sprintStories[0]; impediment: Impediment }[] = [];
  sprintStories.forEach((hu) => {
    (hu.impediments || []).forEach((imp) => {
      allImpediments.push({ hu, impediment: imp });
    });
  });

  const active = allImpediments.filter((i) => !i.impediment.resolvedAt);
  const resolved = allImpediments.filter((i) => !!i.impediment.resolvedAt);

  const handleResolve = () => {
    if (!resolutionDialog) return;
    resolveImpediment(resolutionDialog.huId, resolutionDialog.impId, resolution.trim() || undefined);
    toast.success("Impedimento resolvido!");
    setResolutionDialog(null);
    setResolution("");
  };

  if (!activeSprint) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecione uma Sprint ativa para ver os impedimentos
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Impedimentos Ativos</h3>
          <Badge variant="destructive">{active.length}</Badge>
        </div>
        {active.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              Nenhum impedimento ativo 🎉
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {active.map(({ hu, impediment }) => (
              <Card key={impediment.id} className="border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{hu.code}</Badge>
                        <Badge className={IMPEDIMENT_CRITICALITY_LABELS[impediment.criticality].color + " text-xs"}>
                          {IMPEDIMENT_CRITICALITY_LABELS[impediment.criticality].label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{IMPEDIMENT_TYPE_LABELS[impediment.type]}</Badge>
                      </div>
                      <p className="text-sm font-medium">{impediment.reason}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>HU: {hu.title}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(impediment.reportedAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {impediment.hasTicket && impediment.ticketId && (
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="gap-1">
                            <Link2 className="h-3 w-3" />
                            {impediment.ticketId}
                          </Badge>
                          {impediment.ticketUrl && (
                            <a href={impediment.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              Abrir chamado <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 shrink-0 text-success border-success/30 hover:bg-success/10"
                      onClick={() => setResolutionDialog({ huId: hu.id, impId: impediment.id })}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h3 className="font-semibold">Resolvidos</h3>
            <Badge variant="secondary">{resolved.length}</Badge>
          </div>
          <div className="space-y-2">
            {resolved.map(({ hu, impediment }) => (
              <Card key={impediment.id} className="border-l-4 border-l-success opacity-70">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">{hu.code}</Badge>
                    <span className="text-sm">{impediment.reason}</span>
                    <Badge variant="secondary" className="text-xs">{IMPEDIMENT_TYPE_LABELS[impediment.type]}</Badge>
                    {impediment.resolution && (
                      <span className="text-xs text-muted-foreground">— {impediment.resolution}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!resolutionDialog} onOpenChange={(v) => !v && setResolutionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Resolver Impedimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Como foi resolvido? (opcional)</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Descreva a resolução..." className="mt-1" />
            </div>
            <Button onClick={handleResolve} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Confirmar Resolução
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
