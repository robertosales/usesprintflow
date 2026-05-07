import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Download, Eye } from 'lucide-react';
import { ExportFormat, MemberScope, ReportConfig, ReportType, REPORT_META } from './types';

interface Developer { id: string; name: string; role: string; }

interface Props {
  open: boolean;
  reportType: ReportType;
  sprints: { id: string; name: string }[];
  developers: Developer[];
  onClose: () => void;
  onGenerate: (config: ReportConfig, preview: boolean) => void;
}

export function ReportConfigModal({ open, reportType, sprints, developers, onClose, onGenerate }: Props) {
  const meta = REPORT_META.find(r => r.type === reportType)!;
  const isBilling = reportType === 'billing';

  const [sprintId, setSprintId]       = useState(sprints[0]?.id ?? '');
  const [format, setFormat]           = useState<ExportFormat>('pdf');
  const [memberScope, setMemberScope] = useState<MemberScope>('all');
  const [memberId, setMemberId]       = useState<string>('');

  const selectedDev = developers.find(d => d.id === memberId);
  const scope: MemberScope = memberScope === 'all' ? 'all' : memberId;

  const config: ReportConfig = {
    type: reportType,
    sprintId,
    periodStart: '',
    periodEnd: '',
    format,
    memberScope: scope,
  };

  const previewLabel = scope === 'all'
    ? `Todos os membros (${developers.length}) · ${sprints.find(s => s.id === sprintId)?.name}`
    : `${selectedDev?.name ?? '—'} · ${sprints.find(s => s.id === sprintId)?.name}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span>{meta.icon}</span>
            <span>{meta.title}</span>
            <Badge variant="outline" className="ml-auto text-xs">{meta.audience}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-2">
          {/* Coluna esquerda */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sprints.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Formato de exportação</Label>
              <div className="flex gap-2">
                {(['pdf', 'xlsx', 'csv'] as ExportFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      format === f
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    {f === 'pdf' ? '📄 PDF' : f === 'xlsx' ? '📊 Excel' : '📋 CSV'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita — seletor de membro (só billing e individual mostram isso) */}
          <div className="space-y-3">
            <Label>Imprimir para:</Label>
            <RadioGroup value={memberScope} onValueChange={setMemberScope} className="space-y-2">
              {/* Todos */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                memberScope === 'all' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <RadioGroupItem value="all" className="mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Todos os membros</p>
                  <p className="text-xs text-muted-foreground">
                    {format === 'pdf' ? 'Quebra de página entre membros' :
                     format === 'xlsx' ? 'Uma aba por membro' :
                     'Linhas agrupadas por membro'}
                  </p>
                </div>
              </label>

              {/* Específico */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                memberScope === 'specific' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <RadioGroupItem value="specific" className="mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold">Membro específico</p>
                  {memberScope === 'specific' && (
                    <Select value={memberId} onValueChange={setMemberId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar membro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {developers.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            <span className="font-medium">{d.name}</span>
                            <span className="text-muted-foreground ml-1 text-xs">· {d.role}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        {/* Preview summary */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold">📋 Será gerado: </span>{previewLabel}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="outline" onClick={() => onGenerate(config, true)}>
            <Eye className="h-4 w-4 mr-1.5" /> Pré-visualizar
          </Button>
          <Button onClick={() => onGenerate(config, false)}>
            <Download className="h-4 w-4 mr-1.5" /> Gerar e Baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
