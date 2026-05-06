import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UserStory } from "@/types/sprint";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  hu: UserStory;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-300",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-amber-100 text-amber-700 border-amber-300",
  critical: "bg-red-100 text-red-700 border-red-300",
};

export function KanbanCard({ hu }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: hu.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-card border"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-mono text-muted-foreground">{hu.code}</span>
        {hu.priority && (
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 h-4 ${PRIORITY_COLORS[hu.priority] ?? ""}`}
          >
            {hu.priority}
          </Badge>
        )}
      </div>
      <p className="text-xs font-medium text-foreground line-clamp-3 leading-snug">
        {hu.title}
      </p>
      {(hu.storyPoints != null || hu.estimatedHours != null) && (
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          {hu.storyPoints != null && <span>{hu.storyPoints} SP</span>}
          {hu.estimatedHours != null && <span>{hu.estimatedHours}h</span>}
        </div>
      )}
    </Card>
  );
}