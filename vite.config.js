import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: [
      {
        find: /^sql\.js$/,
        replacement: path.resolve("node_modules/sql.js/dist/sql-wasm.js"),
      },
    ],
  },
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    include: ["sql.js"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    commonjsOptions: {
      include: [/sql\.js/, /node_modules/],
    },
  },
});
