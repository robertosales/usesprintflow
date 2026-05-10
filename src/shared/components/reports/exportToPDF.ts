// exportToPDF — motor de PDF compartilhado entre Sala Ágil e Sustentação
// Usa logo Axion via fetch('/axion-logo.png'), sem coluna Tipo, agrupado por HU
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFActivity {
  code: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  hours: number;
  huCode: string;
  huTitle?: string;
}

export interface PDFMemberSection {
  name: string;
  role: string;
  sprintName: string;
  sprintStart?: string;
  sprintEnd?: string;
  teamName: string;
  activities: PDFActivity[];
}

export interface ExportToPDFOptions {
  reportTitle: string;
  reportSubtitle?: string;
  emittedBy: string;
  restrictLabel?: string;
  sections: PDFMemberSection[];
  filename: string;
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/axion-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function groupByHU(acts: PDFActivity[]) {
  const map = new Map<string, { huCode: string; huTitle: string; acts: PDFActivity[]; subtotal: number }>();
  for (const a of acts) {
    const key = a.huCode || 'SEM-HU';
    if (!map.has(key)) map.set(key, { huCode: a.huCode || '—', huTitle: a.huTitle || '', acts: [], subtotal: 0 });
    const g = map.get(key)!;
    g.acts.push(a);
    g.subtotal += Number(a.hours) || 0;
  }
  return [...map.values()];
}

export async function exportToPDF(opts: ExportToPDFOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');
  const logoBase64 = await loadLogoBase64();

  opts.sections.forEach((sec, idx) => {
    if (idx > 0) doc.addPage();

    // ── Faixa de cabeçalho
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 297, 26, 'F');

    // Logo Axion
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', 8, 4, 18, 18); } catch { /* ignora */ }
    }

    const textX = logoBase64 ? 30 : 10;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Axion — Operações & Fluxo Ágil', textX, 10);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(opts.reportTitle + (opts.reportSubtitle ? `  ·  ${opts.reportSubtitle}` : ''), textX, 17);
    doc.setFontSize(8);
    doc.text(`Emitido em: ${dateStr} às ${timeStr}  ·  Por: ${opts.emittedBy}`, 160, 10);
    if (opts.restrictLabel) doc.text(opts.restrictLabel, 160, 17);

    // ── Sub-header do membro
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(sec.name, 10, 36);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const metaLine = [sec.role, sec.sprintName, sec.sprintStart && sec.sprintEnd ? `${sec.sprintStart} → ${sec.sprintEnd}` : '', sec.teamName ? `Time: ${sec.teamName}` : '']
      .filter(Boolean).join('  ·  ');
    doc.text(metaLine, 10, 42);
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 45, 287, 45);

    // ── Tabela agrupada por HU
    const groups = groupByHU(sec.activities);
    const totalH = sec.activities.reduce((s, a) => s + (Number(a.hours) || 0), 0);
    const body: any[][] = [];

    for (const g of groups) {
      if (g.huCode !== '—') {
        body.push([{
          content: `${g.huCode}${g.huTitle ? '  —  ' + g.huTitle : ''}`,
          colSpan: 6,
          styles: { fillColor: [237, 233, 254], textColor: [55, 48, 163], fontStyle: 'bold', fontSize: 8 },
        }]);
      }
      for (const a of g.acts) {
        body.push([a.code, a.title, a.status, a.startDate || '—', a.endDate || '—', `${a.hours}h`]);
      }
      if (groups.length > 1 || g.huCode !== '—') {
        body.push([{
          content: `SUBTOTAL ${g.huCode}`,
          colSpan: 5,
          styles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 8 },
        }, {
          content: `${g.subtotal}h`,
          styles: { fillColor: [241, 245, 249], textColor: [79, 70, 229], fontStyle: 'bold', fontSize: 8 },
        }]);
      }
    }

    autoTable(doc, {
      head: [['Código', 'Título da Atividade', 'Status', 'Início', 'Fim', 'Horas']],
      body,
      startY: 49,
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 110 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18, fontStyle: 'bold', textColor: [79, 70, 229], halign: 'center' },
      },
    });

    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Total: ${totalH}h lançadas  ·  ${sec.activities.length} atividades`, 10, pageH - 8);
    doc.text('Assinatura: _______________________________', 187, pageH - 8);
  });

  doc.save(`${opts.filename}.pdf`);
}
