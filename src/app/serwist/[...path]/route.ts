import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import type { NextRequest } from "next/server";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

const serwistRoute = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});

export const { dynamic, dynamicParams, revalidate } = serwistRoute;

// Bridge types: Serwist returns { path: string }, Next.js 16 [..path] needs { path: string[] }
export async function generateStaticParams() {
  const params = await serwistRoute.generateStaticParams();
  return params.map((p) => ({
    path: typeof p.path === "string" ? p.path.split("/") : [p.path],
  }));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const resolved = await context.params;
  const pathStr = Array.isArray(resolved.path)
    ? resolved.path.join("/")
    : resolved.path;

  return serwistRoute.GET(request, {
    params: Promise.resolve({ path: pathStr }),
  });
}
