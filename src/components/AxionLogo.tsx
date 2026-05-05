import { cn } from "@/lib/utils";

interface AxionLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  tagline?: boolean;
}

/**
 * Axion brand mark — stylized "A" split in two ribbons:
 * green (Sala Ágil / agility) and yellow (Sustentação / sustainability).
 */
export function AxionLogo({ size = 32, className, showText = false, tagline = false }: AxionLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <svg
        aria-label="Axion"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="axion-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d27a" />
            <stop offset="100%" stopColor="#1f9a52" />
          </linearGradient>
          <linearGradient id="axion-yellow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#d4a017" />
          </linearGradient>
        </defs>
        {/* Left (green) leg of the A */}
        <path d="M30 6 L8 58 L20 58 L34 24 Z" fill="url(#axion-green)" />
        {/* Right (yellow) leg with subtle overlap */}
        <path d="M34 6 L56 58 L44 58 L30 24 Z" fill="url(#axion-yellow)" />
        {/* Crossbar */}
        <rect x="20" y="40" width="24" height="6" rx="1" fill="url(#axion-green)" opacity="0.92" />
      </svg>
      {showText && (
        <div className="min-w-0 leading-none">
          <p className="text-[15px] font-bold text-foreground tracking-tight">
            Axi<span className="text-[#1f9a52]">o</span>n
          </p>
          {tagline && (
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">
              Operações & Fluxo Ágil
            </p>
          )}
        </div>
      )}
    </div>
  );
}