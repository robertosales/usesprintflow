/**
 * HorasInput — campo de horas no formato HH:MM com máscara automática.
 * Converte valor interno (decimal) para HH:MM na UI e vice-versa.
 *
 * Exemplos de autoformatação enquanto digita:
 *   "15"  → 00:15
 *   "130" → 01:30
 *   "245" → 02:45
 *
 * Props:
 *   value: número decimal (ex: 2.5 = 02:30)
 *   onChange: chamado com o número decimal após validação
 */
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Converte decimal (ex: 2.5) para string "HH:MM" */
export function decimalToHHMM(decimal: number): string {
  const totalMinutes = Math.round(decimal * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Converte string "HH:MM" para decimal (ex: "02:30" → 2.5) */
export function hhmmToDecimal(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  return h + m / 60;
}

/**
 * Aplica máscara enquanto o usuário digita digitos.
 * Entrada: somente dígitos (sem :)
 * Formata como HH:MM usando as regras:
 *   1 ou 2 dígitos  → 00:XX
 *   3 dígitos        → 0H:MM
 *   4+ dígitos       → HH:MM (trunca em 4)
 */
function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `00:${digits.padStart(2, "0")}`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function isValidHHMM(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [, mStr] = value.split(":");
  const m = parseInt(mStr, 10);
  return m >= 0 && m <= 59;
}

interface HorasInputProps {
  value: number;
  onChange: (decimal: number) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

export function HorasInput({
  value,
  onChange,
  className,
  disabled,
  placeholder = "00:00",
  id,
}: HorasInputProps) {
  const [display, setDisplay] = useState(() => (value > 0 ? decimalToHHMM(value) : ""));
  const [error, setError] = useState("");
  const skipSync = useRef(false);

  // Sincroniza value externo → display (ex: ao abrir edição)
  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return; }
    setDisplay(value > 0 ? decimalToHHMM(value) : "");
    setError("");
  }, [value]);

  const handleChange = (raw: string) => {
    // Permite apagar
    if (raw === "") {
      setDisplay("");
      setError("");
      onChange(0);
      return;
    }
    // Se usuário digitou só números, aplica máscara
    const masked = applyMask(raw);
    setDisplay(masked);

    if (masked && isValidHHMM(masked)) {
      setError("");
      skipSync.current = true;
      onChange(hhmmToDecimal(masked));
    } else if (masked.length === 5) {
      setError("Minutos inválidos (00–59)");
    }
  };

  const handleBlur = () => {
    if (!display) { setError(""); return; }
    if (!isValidHHMM(display)) {
      setError("Formato inválido. Use HH:MM (ex: 01:30)");
    } else {
      setError("");
    }
  };

  return (
    <div className="space-y-1">
      <Input
        id={id}
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("font-mono", error ? "border-destructive focus-visible:ring-destructive" : "", className)}
        inputMode="numeric"
        maxLength={5}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
