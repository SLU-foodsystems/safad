import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import statCsvFiles from "./build-utils/stat-input-files";

// https://vitejs.dev/config/
export default defineConfig({
  root: "src",
  publicDir: "../public",
  build: {
    outDir: "../dist",
  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    __INPUT_FILE_MDATES__: await statCsvFiles("./src/default-input-files/"),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
