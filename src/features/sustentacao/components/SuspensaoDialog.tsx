import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (justificativa: string, novaPrevisao: string) => void;
}

export function SuspensaoDialog({ open, onClose, onConfirm }: Props) {
  const [justificativa, setJustificativa] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState<Date | undefined>();

  const handle = () => {
    if (!justificativa.trim()) {
      toast.error("Preencha a justificativa da suspensão.");
      return;
    }
    if (!novaPrevisao) {
      toast.error("Informe a nova previsão de encerramento.");
      return;
    }
    onConfirm(justificativa.trim(), format(novaPrevisao, 'yyyy-MM-dd'));
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Suspender Demanda</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Justificativa da suspensão <span className="text-destructive">*</span></Label>
            <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3} placeholder="Informe o motivo da suspensão..." className="mt-1" />
          </div>
          <div>
            <Label>Nova previsão de encerramento <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !novaPrevisao && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {novaPrevisao ? format(novaPrevisao, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={novaPrevisao} onSelect={setNovaPrevisao} className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-destructive">⚠️ Preencha a justificativa e a data de previsão antes de suspender a demanda.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handle}>Confirmar Suspensão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
