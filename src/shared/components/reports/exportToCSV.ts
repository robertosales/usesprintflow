/**
 * exportToCSV — aceita array de objetos planos.
 * As chaves do primeiro objeto viram cabeçalho.
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const header = headers.map((h) => `"${h}"`).join(",");
  const body = data
    .map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
