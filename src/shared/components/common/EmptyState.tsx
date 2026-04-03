import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icon className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm mt-1 text-center max-w-sm">{description}</p>}
        {actionLabel && onAction && (
          <Button size="sm" className="mt-4 gap-1.5" onClick={onAction}>
            <Plus className="h-4 w-4" /> {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
