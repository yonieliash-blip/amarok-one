import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx", "src/styles.css"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
