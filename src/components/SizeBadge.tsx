import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSizeByKey } from "@/lib/sizeReference";

interface SizeBadgeProps {
  sizeReference?: string | null;
  storyPoints?: number;
  className?: string;
}

export function SizeBadge({ sizeReference, storyPoints, className }: SizeBadgeProps) {
  const size = getSizeByKey(sizeReference);

  if (!size && !storyPoints) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (size) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={`text-xs font-bold ${className || ""}`}>
              {size.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{size.points} pts · {size.hours}h</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant="secondary" className={`text-xs ${className || ""}`}>
      {storyPoints} pts
    </Badge>
  );
}
