import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSizeByKey } from "@/lib/sizeReference";

interface SizeBadgeProps {
  sizeReference?: string | null;
  storyPoints?: number;
  className?: string;
}

export function SizeBadge({ sizeReference, storyPoints, className, estimatedHours, functionPoints }: SizeBadgeProps & { estimatedHours?: number | null; functionPoints?: number | null }) {
  const size = getSizeByKey(sizeReference);
  const hours = estimatedHours ?? size?.hours;
  const fp = functionPoints;

  // Show combined badge: ⏱ Xh · ƒ X PF
  const parts: string[] = [];
  if (hours) parts.push(`⏱ ${hours}h`);
  if (fp) parts.push(`ƒ ${fp} PF`);

  if (parts.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={`text-xs font-bold gap-1 ${className || ""}`}>
              {parts.join(" · ")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{size ? `${size.label} — ` : ""}{hours ? `${hours}h` : ""}{ fp ? ` · ${fp} PF` : ""}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!size && !storyPoints) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (size) {
    return (
      <Badge variant="secondary" className={`text-xs font-bold ${className || ""}`}>
        {size.label} — {size.hours}h
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={`text-xs ${className || ""}`}>
      {storyPoints} pts
    </Badge>
  );
}
