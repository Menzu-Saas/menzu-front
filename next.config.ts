import type { NextConfig } from "next";
import { apiOrigin, missingDeployVariables } from "./src/lib/split-deploy";

if (process.env.VERCEL === "1") {
  const missing = missingDeployVariables();
  if (missing.length) throw new Error(`Variáveis de ambiente ausentes na Vercel: ${missing.join(", ")}`);
}

const config: NextConfig = {
  env: { NEXT_PUBLIC_MENZU_APP: "restaurant" },
  // /api/* é atendido pela API (repositório menzu-api).
  async rewrites() {
    const api = apiOrigin();
    return { beforeFiles: api ? [{ source: "/api/:path*", destination: `${api}/api/:path*` }] : [], afterFiles: [], fallback: [] };
  },
};
export default config;
