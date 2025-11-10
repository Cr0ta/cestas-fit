import { createClient } from "@supabase/supabase-js";

// URL fixa do seu projeto Supabase
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dxaxexgrawcwtamrhlxb.supabase.co";

// 🔑 SUA CHAVE ANON (PUBLIC) COMPLETA AQUI
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "COLOQUE_AQUI_SUA_CHAVE_ANON_COMPLETA";

// (não usar service_role aqui)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Em vez de derrubar o build, só avisa no console.
  console.warn(
    "⚠️ Supabase não configurado corretamente. Usando valores padrão/local."
  );
}

// Cliente pronto pra ser usado no app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
