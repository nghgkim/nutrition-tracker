import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      JWT_SECRET: "test-jwt-secret-not-for-production",
      CRON_SECRET: "test-cron-secret-not-for-production",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
