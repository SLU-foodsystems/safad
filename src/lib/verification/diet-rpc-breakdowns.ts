/**
 * Computes the footprints of each rpc in the recipe.
 */

import reduceDiet from "@/lib/rpc-reducer";
import ResultsEngine from "@/lib/ResultsEngine";

import rpcNamesJson from "@/data/rpc-names.json";

import {
  diet,
  emissionsFactorsEnergy,
  emissionsFactorsPackaging,
  emissionsFactorsTransport,
  foodsRecipes,
  footprintsRpcs,
  preparationProcessesAndPackaging,
  processesEnergyDemands,
} from "../default-files-importer";

const rpcNames = rpcNamesJson as Record<string, string>;

type LlCountryName =
  | "France"
  | "Germany"
  | "Greece"
  | "Hungary"
  | "Ireland"
  | "Italy"
  | "Poland"
  | "Spain"
  | "Sweden"
  | "SwedenBaseline";

let LL_COUNTRIES: LlCountryName[] = [
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Spain",
  "Sweden",
  "SwedenBaseline",
];

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
  const HEADER = [
    "Code",
    "Name",
    "Amount",
    "Breaks down into code",
    "Name",
    "Amount",
  ];

  const dietFiles = {
    France: await diet("FR"),
    Germany: await diet("DE"),
    Greece: await diet("GR"),
    Hungary: await diet("HU"),
    Ireland: await diet("IE"),
    Italy: await diet("IT"),
    Spain: await diet("ES"),
    Sweden: await diet("SE"),
    SwedenBaseline: await diet("SE-B"),
  } as Record<string, [string, number][]>;

  const processesAndPackagingCsvData = await preparationProcessesAndPackaging();

  const recipes = await foodsRecipes();

  const RE = new ResultsEngine();
  RE.setFoodsRecipes(recipes);
  RE.setFootprintsRpcs(await footprintsRpcs());
  RE.setEmissionsFactorsPackaging(await emissionsFactorsPackaging());
  RE.setEmissionsFactorsEnergy(await emissionsFactorsEnergy());
  RE.setEmissionsFactorsTransport(await emissionsFactorsTransport());
  RE.setProcessesEnergyDemands(await processesEnergyDemands());
  RE.setPrepProcessesAndPackaging(processesAndPackagingCsvData);

  const allResults = LL_COUNTRIES.map((country) => {
    const subDiets = dietFiles[country].map(([code, amount]) => [
      code,
      amount,
      reduceDiet([[code, amount]], recipes, processesAndPackagingCsvData)[0],
    ]);

    const subDietRows: string[] = [];
    subDiets.forEach(([code, amount, rpcs]) => {
      const rpcs_ = rpcs as [string, number][];
      const code_ = code as string;
      rpcs_.forEach(([rpcCode, rpcAmount]) => {
        subDietRows.push(
          [
            code,
            `"${rpcNames[code_]}"`,
            amount,
            rpcCode,
            `"${rpcNames[rpcCode]}"`,
            rpcAmount,
          ].join(",")
        );
      });
    });

    const csv = subDietRows.join("\n");
    return [country, HEADER.join(",") + "\n" + csv];
  });

  return allResults;
}
