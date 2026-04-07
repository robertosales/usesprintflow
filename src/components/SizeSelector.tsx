import { SIZE_REFERENCES, type SizeReference } from "@/lib/sizeReference";
import { cn } from "@/lib/utils";

interface SizeSelectorProps {
  value: string | null;
  onChange: (size: SizeReference | null) => void;
}

export function SizeSelector({ value, onChange }: SizeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Pontos</label>
      <div className="flex gap-2 flex-wrap">
        {SIZE_REFERENCES.map((size) => {
          const selected = value === size.key;
          return (
            <button
              key={size.key}
              type="button"
              onClick={() => onChange(selected ? null : size)}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2 min-w-[72px] transition-all text-center cursor-pointer",
                selected
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/50 text-foreground"
              )}
            >
              <span className="text-sm font-bold">{size.label} — {size.hours}h</span>
              <span className="text-[10px] text-muted-foreground">{size.pointsLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
