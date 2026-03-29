import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { toast } from "sonner";

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
}

export function ExportButton({ getData }: { getData: () => ExportData }) {
  const [exporting, setExporting] = useState(false);

  const exportCSV = () => {
    const { headers, rows, title } = getData();
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${title}.csv`);
    toast.success("CSV exportado com sucesso!");
  };

  const exportXLSX = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const { headers, rows, title } = getData();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Style column widths
      ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length, 12) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dados");
      XLSX.writeFile(wb, `${title}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar Excel");
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const { headers, rows, title } = getData();

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Exportado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 22);

      autoTable(doc, {
        head: [headers],
        body: rows.map((r) => r.map(String)),
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      doc.save(`${title}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={exporting}>
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV} className="gap-2 text-xs">
          <Table2 className="h-3.5 w-3.5" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportXLSX} className="gap-2 text-xs">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
