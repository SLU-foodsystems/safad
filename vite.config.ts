import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnpluginInjectPreload from "unplugin-inject-preload/vite";

import statCsvFiles from "./build-utils/stat-input-files";
import countCommitsSince from "./build-utils/count-commits";

/**
 * If you want to change the version, update these variables below:
 */
const VERSION_MAJOR = 1;
const VERSION_MINOR_COUNT_SINCE = "07 March 2024";
// End of where to update the version

const getMinorVersion = (since: string) =>
  countCommitsSince(since).catch((err) => {
    console.error(err);
    return 0;
  });

const padLeft = (number: number | string, minLen: number): string =>
  minLen > 0 && String(number).length < minLen
    ? ("0".repeat(minLen) + number).slice(-1 * minLen)
    : String(number);

const fmtDate = (d: Date = new Date(), sep = "-") => {
  const yyyy = d.getFullYear();
  const mm = padLeft(d.getMonth() + 1, 2);
  const dd = padLeft(d.getDate(), 2);
  return yyyy + sep + mm + sep + dd;
};

const getFullVersion = async () =>
  VERSION_MAJOR +
  "." +
  (await getMinorVersion(VERSION_MINOR_COUNT_SINCE)) +
  ` (${fmtDate()})`;

// https://vitejs.dev/config/
export default defineConfig({
  root: "src",
  publicDir: "../public",
  // Ensure we use 'modern' over 'legacy' (JS) API for sass
  // See: https://sass-lang.com/documentation/breaking-changes/legacy-js-api/#bundlers
  //      https://vite.dev/config/shared-options.html#css-preprocessoroptions
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
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
    __APP_VERSION__: JSON.stringify(await getFullVersion()),
  },
});
