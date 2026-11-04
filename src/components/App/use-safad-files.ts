import { onMounted, ref, watch, type Ref } from "vue";

import * as DefaultInputFiles from "@/lib/default-input-files";
import { resetFile } from "@/lib/file-interface-utils";
import ResultsEngine from "@/lib/ResultsEngine";
import {
  CsvValidationError,
  CsvValidationErrorType,
} from "@/lib/input-files-parsers";

import initFileInterfaces from "./init-file-interfaces";

export default function useSafadFiles(
  resultsEngine: ResultsEngine,
  countryCode: Ref<string>
) {
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const files = initFileInterfaces(resultsEngine);

  watch(countryCode, async () => {
    resultsEngine.setCountryCode(countryCode.value);

    isLoading.value = true;
    const promises: Promise<unknown>[] = [];

    if (files.rpcOriginWasteFile.value.state === "default") {
      promises.push(resetFile(countryCode.value, files.rpcOriginWasteFile.value));
    }
    if (files.wasteRetailAndConsumerFile.value.state === "default") {
      promises.push(
        resetFile(countryCode.value, files.wasteRetailAndConsumerFile.value)
      );
    }
    if (files.dietFile.value.state === "default") {
      promises.push(
        resetFile(countryCode.value, files.dietFile.value).catch((err) => {
          const fileIsEmpty =
            err instanceof CsvValidationError &&
            err.type === CsvValidationErrorType.Empty;

          if (fileIsEmpty && countryCode.value === "PL") {
            files.diet.value = [];
            return;
          }

          throw err;
        })
      );
    }

    await Promise.all(promises);
    isLoading.value = false;
  });

  onMounted(async () => {
    isLoading.value = true;

    const setupDefaultDiet =
      countryCode.value === "PL"
        ? Promise.resolve(files.dietFile.value.setter([]))
        : files.dietFile.value
            .getDefault(countryCode.value)
            .then((data: string) => {
              files.dietFile.value.setter(files.dietFile.value.parser(data));
            });

    await Promise.all([
      DefaultInputFiles.configureResultsEngine(
        resultsEngine,
        countryCode.value
      ),
      files.sfaRecipesFile.value
        .getDefault(countryCode.value)
        .then((data: string) => {
          files.sfaRecipesFile.value.setter(
            files.sfaRecipesFile.value.parser(data)
          );
        }),
      setupDefaultDiet,
    ]);

    isLoading.value = false;
    isInitialized.value = true;
  });

  return {
    ...files,
    isLoading,
    isInitialized,
  };
}
