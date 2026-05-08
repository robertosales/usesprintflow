/**
 * HorasInput — idêntico ao campo "Duração estimada" do ActivityManager.
 *
 * value   : string H:MM (ex: "1:30") gerenciada pelo pai
 * onChange: chamado com a string a cada tecla
 * onBlur  : se digitou só números (ex: "2"), auto-formata para "2:00"
 */
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type HorasInputProps = {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
};

export function HorasInput({
  value = "",
  onChange,
  onBlur,
  placeholder = "H:MM",
  className,
  id,
  disabled,
}: HorasInputProps) {
  const handleBlur = () => {
    if (/^\d+$/.test(value)) {
      onChange(`${value}:00`);
    }
    onBlur?.();
  };

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        className={cn("pr-14", className)}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
        h:min
      </span>
    </div>
  );
}

/** "1:30" → 1.5  |  "" ou inválido → 0 */
export function hhmmToDecimal(value: string): number {
  const [h = "0", m = "0"] = value.split(":");
  return (parseInt(h, 10) || 0) + (parseInt(m, 10) || 0) / 60;
}

/** 1.5 → "1:30"  |  0 ou negativo → "" */
export function decimalToHHMM(decimal: number): string {
  if (!decimal || decimal <= 0) return "";
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

/** valida H:MM ou HH:MM */
export function isValidHHMM(value: string): boolean {
  return /^\d+:[0-5]\d$/.test(value);
}
