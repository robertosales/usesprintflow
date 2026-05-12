import { useMemo, useState } from "react";
import { User, CheckCircle, Clock, Zap, Bug, FileDown, Eye, CalendarDays } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  ReportLayout,
  ReportPageHeader,
  ReportKPISummary,
  ReportChart,
  ReportFilterBar,
  ReportDataTable,
  exportToCSV,
} from "@/shared/components/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/personName";
import { formatMinutes } from "@/lib/duration";
import { toast } from "sonner";

interface Props {
  sprints:     { id: string; name: string; isActive?: boolean; start_date?: string; end_date?: string }[];
  developers:  { id: string; name: string; role: string }[];
  rawData: {
    sprints:      any[];
    hus:          any[];
    activities:   any[];
    impediments:  any[];
    developers:   any[];
  };
  teamName:        string;
  currentUserName: string;
  onBack:          () => void;
}

const MEMBER_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#ec4899", "#f97316",
];

const AGIL_PRIMARY: [number, number, number] = [22, 163, 74];
const AGIL_DARK:    [number, number, number] = [20, 83, 45];
const AGIL_LIGHT:   [number, number, number] = [220, 252, 231];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}

function effStatus(e: number): "good" | "warning" | "danger" {
  return e >= 80 ? "good" : e >= 60 ? "warning" : "danger";
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function fmtDatePDF(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** "YYYY-MM-DD" → "dd/MM/yyyy" para exibir no PDF exatamente como o usuário informou */
function isoToBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Decimal ou "H:mm" → minutos inteiros */
function toMin(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  const s = String(val);
  if (s.includes(":")) {
    const [h, m] = s.split(":").map(Number);
    return (isFinite(h) ? h : 0) * 60 + (isFinite(m) ? m : 0);
  }
  const n = Number(s);
  return isFinite(n) ? Math.round(n * 60) : 0;
}

/** Formata para "Xh" / "Xh Ymin" / "Y min" */
function fmtH(val: number | string | null | undefined): string {
  return formatMinutes(toMin(val));
}

/** Data de lançamento: created_at → start_date → end_date */
function lancamentoDate(act: any): string {
  return (act.created_at || act.start_date || act.end_date || "").slice(0, 10);
}

// ─── Agrupamento por HU + Data (usado pelos cards de tela — preservado)
interface DayGroup {
  date:     string;
  rows:     any[];
  totalMin: number;
}
interface HuGroup {
  huCode:   string;
  huTitle:  string;
  days:     DayGroup[];
  totalMin: number;
}

function groupByHuDate(acts: any[]): HuGroup[] {
  const huMap = new Map<string, { huCode: string; huTitle: string; dateMap: Map<string, any[]> }>();
  for (const row of acts) {
    const huKey = row.hu !== "—" ? row.hu : "SEM-HU";
    const date  = lancamentoDate(row);
    if (!huMap.has(huKey)) huMap.set(huKey, { huCode: row.hu, huTitle: row._huTitle || "", dateMap: new Map() });
    const huEntry = huMap.get(huKey)!;
    if (!huEntry.dateMap.has(date)) huEntry.dateMap.set(date, []);
    huEntry.dateMap.get(date)!.push(row);
  }
  const result: HuGroup[] = [];
  for (const [, hu] of huMap) {
    const days: DayGroup[] = [...hu.dateMap.keys()].sort().map((date) => {
      const rows     = hu.dateMap.get(date)!;
      const totalMin = rows.reduce((s: number, r: any) => s + toMin(r.horas), 0);
      return { date, rows, totalMin };
    });
    result.push({
      huCode: hu.huCode,
      huTitle: hu.huTitle,
      days,
      totalMin: days.reduce((s, d) => s + d.totalMin, 0),
    });
  }
  return result;
}

// ─── Agrupamento por Data de Início (usado exclusivamente no PDF)
// IMPORTANTE: recebe rows do tableData, que já tem o campo `lancamento` pré-calculado.
// Não usar lancamentoDate() aqui pois o objeto não possui created_at/start_date/end_date.
interface DateGroup {
  date:     string;   // "YYYY-MM-DD"
  rows:     any[];
  totalMin: number;
}

function groupByDataInicio(acts: any[]): DateGroup[] {
  const dateMap = new Map<string, any[]>();
  for (const row of acts) {
    const date = (row.lancamento || "").slice(0, 10); // ← FIX: ler row.lancamento
    if (!dateMap.has(date)) dateMap.set(date, []);
    dateMap.get(date)!.push(row);
  }
  return [...dateMap.keys()].sort().map((date) => {
    const rows     = dateMap.get(date)!;
    const totalMin = rows.reduce((s: number, r: any) => s + toMin(r.horas), 0);
    return { date, rows, totalMin };
  });
}

// ─── Paleta PDF
const PDF = {
  DARK:      [15,  23,  42]  as [number,number,number],
  MUTED:     [100, 116, 139] as [number,number,number],
  LIGHT_BG:  [248, 250, 252] as [number,number,number],
  BORDER:    [226, 232, 240] as [number,number,number],
  HEAD_ROW:  [30,  41,  59]  as [number,number,number],
  // Total do dia
  DAY_TOTAL_BG:  [241, 245, 249] as [number,number,number],
  DAY_DATE_BG:   [236, 253, 245] as [number,number,number],
  DAY_DATE_TXT:  [21,  128, 61]  as [number,number,number],
  // Status
  DONE_TXT:  [6,   95,  70]  as [number,number,number],
  OPEN_TXT:  [146, 64,  14]  as [number,number,number],
  DONE_BG:   [209, 250, 229] as [number,number,number],
  OPEN_BG:   [254, 243, 199] as [number,number,number],
};

// A4 landscape úteis = 253mm  (297 - 22 - 22)
// Data (15%) = 38mm | Descrição (55%) = 139mm | Status (15%) = 38mm | Horas (15%) = 38mm
const COL = { DATE: 38, ACTIVITY: 139, STATUS: 38, HOURS: 38 };

async function buildPDFBlob(
  memberMetrics: ReturnType<typeof buildMemberMetrics>,
  tableData: any[],
  teamName: string,
  currentUserName: string,
  sprintLabel: string,
  filters: Record<string, string>,
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const now = new Date();
  const W   = doc.internal.pageSize.getWidth();
  const ML  = 22;
  const MR  = 22;
  const CW  = W - ML - MR;

  // Período exato do usuário: "dd/MM/yyyy até dd/MM/yyyy"
  const periodoLabel = (filters.dateFrom && filters.dateTo)
    ? `${isoToBR(filters.dateFrom)} até ${isoToBR(filters.dateTo)}`
    : "";

  // Agrupa tableData por membro
  const memberMap = new Map<string, typeof tableData>();
  for (const row of tableData) {
    if (!memberMap.has(row._assigneeId)) memberMap.set(row._assigneeId, []);
    memberMap.get(row._assigneeId)!.push(row);
  }

  const targets = filters.memberId !== "all"
    ? memberMetrics.filter(m => m.id === filters.memberId)
    : memberMetrics;

  targets.forEach((member, idx) => {
    if (idx > 0) doc.addPage();

    // ── Cabeçalho verde
    doc.setFillColor(...AGIL_PRIMARY);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE ATIVIDADES & PRODUTIVIDADE INDIVIDUAL", ML, 10);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Módulo: Sala Ágil", ML, 16);
    doc.text(
      `Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}  ·  Por: ${currentUserName}`,
      ML, 21,
    );

    let y = 31;

    // ── Card do membro
    const cardH = periodoLabel ? 24 : 18;
    doc.setFillColor(...PDF.LIGHT_BG);
    doc.roundedRect(ML, y, CW, cardH, 2, 2, "F");
    doc.setDrawColor(...PDF.BORDER);
    doc.roundedRect(ML, y, CW, cardH, 2, 2, "S");
    // Avatar
    doc.setFillColor(...AGIL_PRIMARY);
    doc.circle(ML + 8, y + cardH / 2, 5.5, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text(getInitials(member.name), ML + 8, y + cardH / 2 + 2, { align: "center" });
    // Nome e cargo
    doc.setTextColor(...PDF.DARK); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(member.name, ML + 17, y + 8);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...PDF.MUTED);
    doc.text(member.role, ML + 17, y + 14);
    // Período
    if (periodoLabel) {
      doc.setFontSize(7.5); doc.setTextColor(...PDF.DARK); doc.setFont("helvetica", "normal");
      doc.text(`Período: ${periodoLabel}`, ML + 17, y + 21);
    }
    // Sprint + Time (direita)
    doc.setFontSize(7.5); doc.setTextColor(...PDF.MUTED);
    doc.text(
      `Sprint: ${sprintLabel}  ·  Time: ${teamName}`,
      ML + CW - 3, y + cardH / 2 + 2, { align: "right" },
    );
    y += cardH + 5;

    // ── KPIs (5 cards)
    doc.setTextColor(...PDF.DARK); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("RESUMO DO MEMBRO", ML, y);
    y += 3;
    const kpiW = CW / 5;
    const acts = memberMap.get(member.id) ?? [];
    const totalMin = acts.reduce((s: number, r: any) => s + toMin(r.horas), 0);
    const kpis = [
      { label: "Atividades",   value: String(member.total),  bg: [219,234,254] as [number,number,number], txt: [30,64,175]   as [number,number,number] },
      { label: "Concluídas",   value: String(member.closed), bg: AGIL_LIGHT,                              txt: AGIL_DARK },
      { label: "Em Aberto",    value: String(member.open),   bg: [255,237,213] as [number,number,number], txt: [154,52,18]   as [number,number,number] },
      { label: "Eficiência",   value: `${member.eff}%`,      bg: [243,232,255] as [number,number,number], txt: [109,40,217]  as [number,number,number] },
      { label: "Horas Concl.", value: fmtH(member.hoursC),   bg: [219,234,254] as [number,number,number], txt: AGIL_PRIMARY },
    ];
    kpis.forEach(({ label, value, bg, txt }, i) => {
      const x = ML + i * kpiW;
      doc.setFillColor(...bg); doc.roundedRect(x, y, kpiW - 1.5, 15, 1.5, 1.5, "F");
      doc.setTextColor(...PDF.MUTED); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      doc.text(label.toUpperCase(), x + (kpiW - 1.5) / 2, y + 5, { align: "center" });
      doc.setTextColor(...txt); doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(value, x + (kpiW - 1.5) / 2, y + 13, { align: "center" });
    });
    y += 20;

    // ── Monta body da tabela agrupado por Data de Início
    const dateGroups = groupByDataInicio(acts);
    const body: any[][] = [];

    for (const group of dateGroups) {
      const dateFmt = group.date ? fmtDatePDF(group.date) : "Sem data";

      group.rows.forEach((r: any, ri: number) => {
        const isDone    = !!r.status;
        const statusTxt = isDone ? "Concluída" : "Em aberto";
        const rowBg     = ri % 2 === 0
          ? [255, 255, 255] as [number,number,number]
          : PDF.LIGHT_BG;

        body.push([
          // Col 0: data só na primeira linha do grupo
          {
            content: ri === 0 ? dateFmt : "",
            styles: {
              fontStyle: ri === 0 ? "bold" : "normal",
              fontSize: ri === 0 ? 8 : 7.5,
              textColor: ri === 0 ? PDF.DAY_DATE_TXT : PDF.MUTED,
              fillColor: ri === 0 ? PDF.DAY_DATE_BG  : rowBg,
              cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 2 },
              valign: "middle",
            },
          },
          // Col 1: descrição atividade
          {
            content: r.titulo,
            styles: {
              fontStyle: "normal",
              fontSize: 8,
              fillColor: rowBg,
              cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
            },
          },
          // Col 2: status
          {
            content: statusTxt,
            styles: {
              fontStyle: "normal",
              fontSize: 7.5,
              textColor: isDone ? PDF.DONE_TXT : PDF.OPEN_TXT,
              fillColor: isDone ? PDF.DONE_BG  : PDF.OPEN_BG,
              halign: "center",
              cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
            },
          },
          // Col 3: horas
          {
            content: fmtH(r.horas),
            styles: {
              fontStyle: "bold",
              fontSize: 8.5,
              textColor: AGIL_PRIMARY,
              fillColor: rowBg,
              halign: "right",
              cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 4 },
            },
          },
        ]);
      });

      // Linha TOTAL DO DIA
      body.push([
        {
          content: "TOTAL DO DIA",
          colSpan: 3,
          styles: {
            fillColor: PDF.DAY_TOTAL_BG,
            textColor: PDF.MUTED,
            fontStyle: "bold",
            fontSize: 7.5,
            cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          },
        },
        {
          content: formatMinutes(group.totalMin),
          styles: {
            fillColor: PDF.DAY_TOTAL_BG,
            textColor: AGIL_PRIMARY,
            fontStyle: "bold",
            fontSize: 9,
            halign: "right",
            cellPadding: { top: 3, bottom: 3, left: 2, right: 4 },
          },
        },
      ]);
    }

    autoTable(doc, {
      head: [[
        { content: "DATA INÍCIO", styles: { halign: "left"   } },
        { content: "DESCRIÇÃO ATIVIDADE", styles: { halign: "left" } },
        { content: "STATUS",              styles: { halign: "center" } },
        { content: "HORAS",               styles: { halign: "right"  } },
      ]],
      body,
      startY: y,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: PDF.BORDER,
        lineWidth: 0.15,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: PDF.HEAD_ROW,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: COL.DATE,     textColor: PDF.DAY_DATE_TXT },
        1: { cellWidth: COL.ACTIVITY },
        2: { cellWidth: COL.STATUS,   halign: "center" },
        3: { cellWidth: COL.HOURS,    halign: "right", fontStyle: "bold", textColor: AGIL_PRIMARY },
      },
      margin: { left: ML, right: MR },
      tableLineColor: PDF.BORDER,
      tableLineWidth: 0.15,
      rowPageBreak: "avoid",
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    const pageH  = doc.internal.pageSize.getHeight();

    // ── Rodapé: Total Geral
    const summaryY = Math.min(finalY, pageH - 22);
    doc.setFillColor(...AGIL_PRIMARY);
    doc.roundedRect(ML, summaryY, CW, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(
      `TOTAL GERAL DE HORAS: ${formatMinutes(totalMin)}`,
      ML + 4, summaryY + 6,
    );
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(
      `TOTAL DE ATIVIDADES: ${acts.length}`,
      ML + 4, summaryY + 12,
    );
    doc.setFontSize(8);
    doc.text(
      `Cycle Time médio: ${member.cycleTime > 0 ? member.cycleTime + "d" : "—"}`,
      ML + CW - 4, summaryY + 9, { align: "right" },
    );

    // ── Numeração de páginas
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...PDF.MUTED);
      doc.text(`Página ${i} de ${totalPages}`, W - MR, pageH - 6, { align: "right" });
      doc.text(
        "Documento gerado automaticamente pelo sistema — Sala Ágil",
        W / 2, pageH - 6, { align: "center" },
      );
    }
  });

  return doc.output("blob");
}

// ─── Métricas por membro
function buildMemberMetrics(developers: Props["developers"], filteredActivities: any[]) {
  return developers.map((dev) => {
    const acts       = filteredActivities.filter((a: any) => a.assignee_id === dev.id);
    const closed     = acts.filter((a: any) => a.is_closed);
    const hoursP     = acts.reduce((s: number, a: any) => s + Number(a.hours), 0);
    const hoursC     = closed.reduce((s: number, a: any) => s + Number(a.hours), 0);
    const bugs       = acts.filter((a: any) => a.activity_type === "bug");
    const bugsClosed = bugs.filter((a: any) => a.is_closed);
    const eff        = hoursP > 0 ? Math.round((hoursC / hoursP) * 100) : 0;
    const cycleTime  = (() => {
      const withDates = closed.filter((a: any) => a.start_date && (a.closed_at || a.end_date));
      if (!withDates.length) return 0;
      const total = withDates.reduce((s: number, a: any) => {
        const end = a.closed_at || a.end_date;
        return s + Math.max(0, (new Date(end).getTime() - new Date(a.start_date).getTime()) / 86400000);
      }, 0);
      return Math.round((total / withDates.length) * 10) / 10;
    })();
    return {
      id: dev.id, name: dev.name, role: dev.role,
      total: acts.length, closed: closed.length, open: acts.length - closed.length,
      hoursP, hoursC, hoursPending: hoursP - hoursC,