import { ref } from "vue";
import type ResultsEngine from "@/lib/ResultsEngine";
import { initInputFile } from "@/lib/file-interface-utils";

import * as DefaultInputFiles from "@/lib/default-input-files";
import * as InputFileParsers from "@/lib/input-files-parsers";

export default function initInputFiles(RE: ResultsEngine) {
  // Needs to be separate, as they're not managed by the ResultsEngine
  const diet = ref<Diet>([]);
  const sfaRecipes = ref<SfaRecipeComponent[]>([]);

  return {
    diet,
    sfaRecipes,

    footprintsRpcsFile: ref(
      initInputFile<RpcFootprintsByOrigin>({
        defaultName: () => "SAFAD ID Footprints RPC.csv",
        getDefault: DefaultInputFiles.raw.footprintsRpcs,
        parser: InputFileParsers.parseFootprintsRpcs,
        setter: RE.setFootprintsRpcs,
      })
    ),

    dietFile: ref(
      initInputFile<Diet>({
        defaultName: (country: string) => `SAFAD ID Diet Spec ${country}.csv`,
        getDefault: DefaultInputFiles.raw.diet,
        parser: InputFileParsers.parseDiet,
        setter: (data: Diet) => {
          diet.value = data;
        },
      })
    ),

    foodsRecipesFile: ref(
      initInputFile<FoodsRecipes>({
        defaultName: () => "SAFAD IP Recipes.csv",
        getDefault: DefaultInputFiles.raw.foodsRecipes,
        parser: InputFileParsers.parseFoodsRecipes,
        setter: RE.setFoodsRecipes,
      })
    ),

    rpcOriginWasteFile: ref(
      initInputFile<RpcOriginWaste>({
        defaultName: (country: string) =>
          `SAFAD IP Origin and Waste of RPC ${country}.csv`,
        getDefault: DefaultInputFiles.raw.rpcOriginWaste,
        parser: InputFileParsers.parseRpcOriginWaste,
        setter: RE.setRpcOriginWaste,
      })
    ),
    processesEnergyDemandsFile: ref(
      initInputFile<Record<string, number[]>>({
        defaultName: () => "SAFAD IP Energy Proc.csv",
        getDefault: DefaultInputFiles.raw.processesEnergyDemands,
        parser: InputFileParsers.parseProcessesEnergyDemands,
        setter: RE.setProcessesEnergyDemands,
      })
    ),
    preparationProcessesFile: ref(
      initInputFile<Record<string, string[]>>({
        defaultName: () => "SAFAD IP Preparation Processes.csv",
        getDefault: DefaultInputFiles.raw.preparationProcesses,
        parser: InputFileParsers.parsePreparationProcesses,
        setter: RE.setPreparationProcesses,
      })
    ),
    packagingCodesFile: ref(
      initInputFile<Record<string, string>>({
        defaultName: () => "SAFAD IP Packaging.csv",
        getDefault: DefaultInputFiles.raw.packagingCodes,
        parser: InputFileParsers.parsePackagingCodes,
        setter: RE.setPackagingCodes,
      })
    ),
    wasteRetailAndConsumerFile: ref(
      initInputFile<Record<string, number[]>>({
        defaultName: (country: string) =>
          `SAFAD IP Waste Retail and Cons ${country}.csv`,
        getDefault: DefaultInputFiles.raw.wasteRetailAndConsumer,
        parser: InputFileParsers.parseWasteRetailAndConsumer,
        setter: RE.setWasteRetailAndConsumer,
      })
    ),

    emissionsFactorsEnergyFile: ref(
      initInputFile<Record<string, number[] | Record<string, number[]>>>({
        defaultName: () => "SAFAD IEF Energy.csv",
        getDefault: DefaultInputFiles.raw.emissionsFactorsEnergy,
        parser: InputFileParsers.parseEmissionsFactorsEnergy,
        setter: RE.setEmissionsFactorsEnergy,
      })
    ),
    emissionsFactorsPackagingFile: ref(
      initInputFile<Record<string, number[]>>({
        defaultName: () => "SAFAD IEF Packaging.csv",
        getDefault: DefaultInputFiles.raw.emissionsFactorsPackaging,
        parser: InputFileParsers.parseEmissionsFactorsPackaging,
        setter: RE.setEmissionsFactorsPackaging,
      })
    ),
    emissionsFactorsTransportFile: ref(
      initInputFile<NestedRecord<string, number[]>>({
        defaultName: () => "SAFAD IEF Transport.csv",
        getDefault: DefaultInputFiles.raw.emissionsFactorsTransport,
        parser: InputFileParsers.parseEmissionsFactorsTransport,
        setter: RE.setEmissionsFactorsTransport,
      })
    ),

    sfaRecipesFile: ref(
      initInputFile<SfaRecipeComponent[]>({
        defaultName: () => "SAFAD IS SFA Recipes.csv",
        getDefault: DefaultInputFiles.raw.sfaRecipes,
        parser: InputFileParsers.parseSfaRecipes,
        setter: (data: SfaRecipeComponent[]) => {
          sfaRecipes.value = data;
        },
      })
    ),
  };
}
