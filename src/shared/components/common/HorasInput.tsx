/**
 * HorasInput — campo de horas no formato HH:MM com máscara automática.
 * Converte valor interno (decimal) para HH:MM na UI e vice-versa.
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

function isValidHHMM(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [, mStr] = value.split(":");
  return parseInt(mStr, 10) <= 59;
}

/**
 * Aplica máscara somente quando a entrada é só dígitos (sem dois pontos).
 * Quando já contém ":" retorna como está para permitir edição livre.
 */
function applyMaskIfNeeded(raw: string): string {
  // Se já tem ":" o usuário está editando diretamente o HH:MM — não aplica máscara
  if (raw.includes(":")) return raw;
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `00:${digits.padStart(2, "0")}`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
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
  const isFocused = useRef(false);
  // Inicializa display com o valor já formatado (inclusive quando value=1 vindo do estado inicial)
  const [display, setDisplay] = useState(() => (value > 0 ? decimalToHHMM(value) : ""));
  const [error, setError] = useState("");

  // Sincroniza value externo → display SOMENTE quando o campo não está focado
  // Isso garante que abrir o modal de edição popula corretamente o campo
  useEffect(() => {
    if (isFocused.current) return; // usuário está digitando — não sobrescreve
    setDisplay(value > 0 ? decimalToHHMM(value) : "");
    setError("");
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    // Seleciona tudo ao focar para facilitar sobrescrever
    e.target.select();
  };

  const handleChange = (raw: string) => {
    if (raw === "") {
      setDisplay("");
      setError("");
      onChange(0);
      return;
    }

    const masked = applyMaskIfNeeded(raw);
    setDisplay(masked);

    if (isValidHHMM(masked)) {
      setError("");
      onChange(hhmmToDecimal(masked));
    } else if (masked.length === 5 && masked.includes(":")) {
      setError("Minutos inválidos (00–59)");
    } else {
      setError("");
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    if (!display) { setError(""); return; }
    if (!isValidHHMM(display)) {
      // Tenta autocompletar: se for só dígitos, aplica máscara final
      const fallback = applyMaskIfNeeded(display);
      if (isValidHHMM(fallback)) {
        setDisplay(fallback);
        setError("");
        onChange(hhmmToDecimal(fallback));
      } else {
        setError("Formato inválido. Use HH:MM (ex: 01:30)");
      }
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
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("font-mono", error ? "border-destructive focus-visible:ring-destructive" : "", className)}
        maxLength={5}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
