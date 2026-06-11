// src/config/app.ts
// ⚠️  Não edite APP_VERSION nem APP_BUILD_DATE manualmente.
//     APP_VERSION é injetada em build-time pelo Vite a partir do package.json.
//     APP_BUILD_DATE deve ser atualizada junto com o bump de versão (evita drift UTC).
//     Para publicar uma nova versão use:
//       npm run release:patch   → 1.2.9 → 1.2.10
//       npm run release:minor   → 1.2.9 → 1.3.0
//       npm run release:major   → 1.2.9 → 2.0.0

export const APP_NAME      = "Axion";
export const APP_TAGLINE   = "Operações & Fluxo Ágil";
export const APP_FULL_NAME = "Axion – Operações e Fluxo Ágil";

/**
 * Versão injetada pelo Vite em build-time (package.json → define).
 * Em dev (vite dev) o fallback garante que não aparece "undefined".
 */
export const APP_VERSION: string =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";

/**
 * Data de release fixada manualmente junto com o bump de versão.
 * NÃO usar new Date() aqui: o servidor de build do Lovable roda em UTC
 * e pode avançar o dia em relação ao fuso de Brasília (UTC-3).
 */
export const APP_BUILD_DATE = "10/06/2026";
