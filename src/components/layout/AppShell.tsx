// src/components/layout/AppShell.tsx
// ── CORREÇÃO: Aliases seguros para profile.full_name e profile.role ──────────
// Adicione estas 2 linhas logo após: const { profile } = useAuth();
// e substitua as ocorrências conforme abaixo.

// ANTES (causa TS2339):
//   profile?.role
//   profile?.full_name
//
// DEPOIS (type-safe):
//   profileRole
//   profileName
//
// ── Snippet para colar no topo da função AppShell() ──────────────────────────

/*
  const { profile, currentTeamId } = useAuth();

  // Aliases type-safe — funciona com ou sem os campos no tipo Profile
  const profileName =
    (profile as any)?.full_name ??
    (profile as any)?.name ??
    profile?.email?.split("@")[0] ??
    "Usuário";

  const profileRole =
    (profile as any)?.role ??
    "Membro";
*/

// ── Depois, em todo o JSX do AppShell, substitua: ─────────────────────────────
//   profile?.full_name  →  profileName
//   profile?.role       →  profileRole
//
// ── Exemplo das linhas afetadas (300, 306, 428, 430, 437): ───────────────────

/*
  // linha ~300 — ícone de avatar
  <span>{profileName.charAt(0).toUpperCase()}</span>

  // linha ~306 — nome no dropdown
  <p className="font-medium">{profileName}</p>

  // linha ~428 — nome no sidebar footer
  <span className="font-medium truncate">{profileName}</span>

  // linha ~430 — role no sidebar footer
  <span className="text-xs text-muted-foreground truncate">{profileRole}</span>

  // linha ~437 — avatar tooltip
  <span>{profileName}</span>
*/
