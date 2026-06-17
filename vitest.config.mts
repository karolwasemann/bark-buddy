// Vitest config: two projects — fast unit tests (jsdom) and integration tests (node + Supabase).

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// Load integration test env vars from .env.test.local
function loadEnvFile(path: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .trim()
        .split("\n")
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx), l.slice(idx + 1)];
        })
    );
  } catch {
    return {};
  }
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          env: loadEnvFile(".env.test.local"),
        },
      },
    ],
  },
});
