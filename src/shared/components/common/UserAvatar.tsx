/**
 * UserAvatar — componente padronizado de avatar de usuário.
 * Usa foto se disponível; fallback com iniciais calculadas por nameUtils.
 * Exporta também o helper formatDisplayName para uso inline.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials, formatDisplayName } from "@/lib/nameUtils";

export { formatDisplayName };

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /** Se true, renderiza nome ao lado do avatar */
  showName?: boolean;
  /** Classe extra para o texto do nome */
  nameClassName?: string;
}

const SIZE_MAP = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

export function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
  className,
  showName = false,
  nameClassName,
}: UserAvatarProps) {
  const initials = getInitials(name);
  const display = formatDisplayName(name);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Avatar className={cn(SIZE_MAP[size], "shrink-0")}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={display || "avatar"} />}
        <AvatarFallback className="bg-primary/15 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span className={cn("text-sm font-medium", nameClassName)}>{display}</span>
      )}
    </span>
  );
}
