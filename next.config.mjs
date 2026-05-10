import { execSync } from "node:child_process";
import withPWAInit from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: true,
  skipWaiting: true,
});

// Build-time version info: SHA + branch + fecha del último commit.
// Vercel inyecta VERCEL_GIT_COMMIT_SHA/REF en producción; en local lo
// leemos vía git. Si falla (carpeta sin .git) cae a "dev/local".
function gitInfo() {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) {
    return {
      sha: vercelSha.slice(0, 7),
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? "main",
      date:
        process.env.VERCEL_GIT_COMMIT_DATE ?? new Date().toISOString(),
    };
  }
  try {
    const sha = execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
    }).trim();
    const ref = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
    const date = execSync("git log -1 --format=%cI", {
      encoding: "utf-8",
    }).trim();
    return { sha, ref, date };
  } catch {
    return { sha: "dev", ref: "local", date: new Date().toISOString() };
  }
}

const { sha, ref, date } = gitInfo();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // CFDIs, INE/CSF escaneadas, etc.
    },
    // Sprint 8 — @nodecfdi/sat-ws-descarga-masiva v2 es ESM-only y se carga
    // dinámicamente desde server actions. Excluirlo del bundling de Next
    // evita errores ERR_REQUIRE_ESM en build.
    serverComponentsExternalPackages: [
      "@nodecfdi/sat-ws-descarga-masiva",
      "@nodecfdi/credentials",
      "yauzl-promise",
    ],
  },
  env: {
    NEXT_PUBLIC_BUILD_SHA: sha,
    NEXT_PUBLIC_BUILD_REF: ref,
    NEXT_PUBLIC_BUILD_DATE: date,
  },
};

export default withPWA(nextConfig);
