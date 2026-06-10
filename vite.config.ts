import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnpluginInjectPreload from "unplugin-inject-preload/vite";

import statCsvFiles from "./build-utils/stat-input-files";

// https://vitejs.dev/config/
export default defineConfig({
  root: "src",
  publicDir: "../public",
  // Ensure we use 'modern' over 'legacy' (JS) API for sass
  // See: https://sass-lang.com/documentation/breaking-changes/legacy-js-api/#bundlers
  //      https://vite.dev/config/shared-options.html#css-preprocessoroptions
  css: {
    preprocessorOptions: {
      scss: { api: "modern-compiler" },
    },
  },
  build: {
    outDir: "../dist",
  },
  plugins: [
    vue(),
    UnpluginInjectPreload({
      files: [
        {
          entryMatch: /people-cooking[a-zA-Z]*\.svg$/,
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    __INPUT_FILE_MDATES__: await statCsvFiles("./src/default-input-files/"),
    __APP_VERSION__: `"${process.env.npm_package_version}"`,
  },
});
