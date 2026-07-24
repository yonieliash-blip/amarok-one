import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const permissionsEntry = path.resolve(__dirname, "../../packages/permissions/src/index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["development", "import", "module", "browser", "default"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@amarok-one/permissions": permissionsEntry,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
