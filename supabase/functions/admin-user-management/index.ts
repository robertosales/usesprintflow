import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateTempPassword(): string {
  // 12 chars: maiúscula + minúscula + dígito + símbolo
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i++) pwd += pick(all);
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Autenticação: exige usuário admin ────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verifica se o caller é admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem executar esta ação" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, user_id, new_email, mode, email_mode } = body as {
      action: "change_email" | "reset_password";
      user_id: string;
      new_email?: string;
      mode?: "temp_password" | "send_link";
      email_mode?: "confirm" | "direct";
    };

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "action e user_id obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Ação: trocar e-mail (com duplo opt-in nativo do Supabase) ────────────
    if (action === "change_email") {
      if (!new_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) {
        return new Response(JSON.stringify({ error: "E-mail inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isDirect = email_mode === "direct";
      // direct  → email_confirm: true  → troca imediata, sem e-mail de confirmação
      // confirm → email_confirm: false → envia e-mail de confirmação ao novo endereço
      const { error } = await admin.auth.admin.updateUserById(user_id, {
        email: new_email,
        email_confirm: isDirect,
      });
      if (error) throw error;

      // Sincroniza profiles.email + força troca de senha em modo direto (segurança)
      const profileUpdate: Record<string, unknown> = {};
      if (isDirect) {
        profileUpdate.email = new_email;
        profileUpdate.must_change_password = true;
      }
      if (Object.keys(profileUpdate).length > 0) {
        await admin.from("profiles").update(profileUpdate).eq("user_id", user_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: isDirect ? "direct" : "confirm",
          message: isDirect
            ? "E-mail trocado com sucesso. O usuário será obrigado a redefinir a senha no próximo login."
            : "E-mail de confirmação enviado para o novo endereço. O usuário deve clicar no link para validar.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Ação: reset de senha ─────────────────────────────────────────────────
    if (action === "reset_password") {
      // Busca o e-mail do usuário-alvo
      const { data: profile } = await admin
        .from("profiles")
        .select("email")
        .eq("user_id", user_id)
        .maybeSingle();
      const targetEmail = profile?.email;

      if (mode === "send_link") {
        if (!targetEmail) {
          return new Response(JSON.stringify({ error: "Usuário sem e-mail cadastrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const origin = req.headers.get("origin") || req.headers.get("referer") || "";
        const cleanOrigin = origin.replace(/\/$/, "").replace(/\/auth.*$/, "");
        const redirectTo = `${cleanOrigin}/reset-password`;

        // Gera link de recuperação. Se o e-mail não estiver configurado,
        // o link é retornado e mostrado ao admin; caso contrário o Supabase envia.
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "recovery",
          email: targetEmail,
          options: { redirectTo },
        });
        if (linkErr) throw linkErr;

        return new Response(
          JSON.stringify({
            success: true,
            mode: "send_link",
            message: "Link de redefinição enviado para o e-mail do usuário.",
            // fallback caso o SMTP não esteja configurado:
            recovery_link: linkData?.properties?.action_link ?? null,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // mode = "temp_password" (default)
      const tempPassword = generateTempPassword();
      const { error: updErr } = await admin.auth.admin.updateUserById(user_id, {
        password: tempPassword,
      });
      if (updErr) throw updErr;

      // Marca o profile para forçar troca no próximo login
      const { error: profErr } = await admin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("user_id", user_id);
      if (profErr) throw profErr;

      return new Response(
        JSON.stringify({
          success: true,
          mode: "temp_password",
          temp_password: tempPassword,
          message: "Senha temporária gerada. Repasse ao usuário — ele será obrigado a trocá-la no próximo login.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});