import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ApfTemplate } from "../services/apf.service";

const VARIABLES = [
  { key: "{{hu_codigo}}", label: "Código da HU" },
  { key: "{{hu_titulo}}", label: "Título da HU" },
  { key: "{{hu_descricao}}", label: "Descrição da HU" },
  { key: "{{baseline_item}}", label: "Item do baseline" },
  { key: "{{tipo}}", label: "Tipo do item" },
  { key: "{{sprint_nome}}", label: "Nome da sprint" },
  { key: "{{data_geracao}}", label: "Data de geração" },
  { key: "{{total_pf}}", label: "Total de Pontos de Função" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; output_type: string; prompt_content: string }) => Promise<void>;
  template?: ApfTemplate | null;
}

export function ApfTemplateModal({ open, onClose, onSave, template }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [outputType, setOutputType] = useState("docx");
  const [promptContent, setPromptContent] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setDescription(template?.description ?? "");
      setOutputType(template?.output_type ?? "docx");
      setPromptContent(template?.prompt_content ?? "");
    }
  }, [open, template]);

  const insertVariable = (varKey: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = promptContent.substring(0, start) + varKey + promptContent.substring(end);
    setPromptContent(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !outputType || !promptContent.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), output_type: outputType, prompt_content: promptContent });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim() && outputType && promptContent.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template" : "Novo Template"}</DialogTitle>
          <DialogDescription>
            {template ? "Atualize as informações do template. A versão será incrementada automaticamente." : "Preencha os campos para criar um novo template de geração APF."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nome <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contagem de HUs por Sprint" />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição <span className="text-muted-foreground text-xs">({description.length}/300)</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="Descreva brevemente o objetivo deste template"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de saída <span className="text-destructive">*</span></Label>
            <Select value={outputType} onValueChange={setOutputType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="docx">DOCX</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Conteúdo do Template / Prompt <span className="text-destructive">*</span></Label>
            <Textarea
              ref={textareaRef}
              value={promptContent}
              onChange={(e) => setPromptContent(e.target.value)}
              placeholder="Descreva as instruções para geração do documento. Use {{hu_codigo}}, {{hu_titulo}}, {{baseline_item}}, {{tipo}} como variáveis substituídas automaticamente."
              className="min-h-[280px] font-mono text-xs"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {VARIABLES.map((v) => (
                <Badge
                  key={v.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors text-xs"
                  onClick={() => insertVariable(v.key)}
                >
                  {v.key}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? "Salvando..." : "Salvar Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}