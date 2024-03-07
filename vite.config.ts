import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
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

const getFullVersion = async () =>
  VERSION_MAJOR + "." + (await getMinorVersion(VERSION_MINOR_COUNT_SINCE));

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
    __APP_VERSION__: JSON.stringify(await getFullVersion()),
  },
});
