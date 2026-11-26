import type { NextConfig } from "next";
import { apiOrigin, missingDeployVariables } from "./src/lib/split-deploy";

if (process.env.VERCEL === "1") {
  const missing = missingDeployVariables();
  if (missing.length) throw new Error(`Variáveis de ambiente ausentes na Vercel: ${missing.join(", ")}`);
}

/**
 * Valores que o navegador precisa (login, envio de imagens e pedidos ao vivo). São gravados no pacote
 * durante o build e ficam VISÍVEIS a qualquer visitante: nunca coloque um segredo nesta lista.
 */
const BROWSER_VARIABLES = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
const browserEnv = Object.fromEntries(BROWSER_VARIABLES.flatMap((name) => {
  const value = process.env[name]?.trim();
  return value ? [[name, value]] : [];
}));

const config: NextConfig = {
  env: { MENZU_APP: "restaurant", ...browserEnv },
  // /api/* é atendido pela API (repositório menzu-api).
  async rewrites() {
    const api = apiOrigin();
    return { beforeFiles: api ? [{ source: "/api/:path*", destination: `${api}/api/:path*` }] : [], afterFiles: [], fallback: [] };
  },
};
export default config;
