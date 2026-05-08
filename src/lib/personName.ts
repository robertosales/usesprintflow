/**
 * personName.ts — alias de compatibilidade para @/lib/nameUtils.
 * Mantido para não quebrar imports existentes em SustentacaoBoard e demais arquivos
 * que já usam getInitials/formatPersonName de @/lib/personName.
 */
export { getInitials, formatDisplayName as formatPersonName } from "./nameUtils";
