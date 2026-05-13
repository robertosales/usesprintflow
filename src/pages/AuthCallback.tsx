// src/pages/AuthCallback.tsx
// Processa o retorno do OAuth do Lovable SDK e/ou Supabase PKCE.
// O Lovable SDK pode retornar tokens via hash (#access_token=...) ou
// via query param (?code=...). Ambos os casos são tratados aqui.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AxionLogo } from "@/components/AxionLogo";

export default function AuthCallback() {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    async function handleCallback() {
      try {
        // Caso 1: PKCE — URL contém ?code=...
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[AuthCallback] exchangeCodeForSession error:", error);
          }
        }

        // Caso 2: Implicit / Lovable SDK — tokens no hash (#access_token=...)
        // O SDK do Supabase detecta o hash automaticamente via onAuthStateChange.
        // Aguardamos a sessão ser estabelecida com polling curto.
        let session = null;
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
          if (session) break;
          await new Promise((r) => setTimeout(r, 300));
        }

        if (session) {
          navigate("/", { replace: true });
        } else {
          console.warn("[AuthCallback] nenhuma sessão encontrada após callback");
          navigate("/auth?error=no_session", { replace: true });
        }
      } catch (err) {
        console.error("[AuthCallback] erro inesperado:", err);
        navigate("/auth?error=unexpected", { replace: true });
      }
    }

    void handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <AxionLogo size={48} />
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Finalizando autenticação...</p>
      </div>
    </div>
  );
}
