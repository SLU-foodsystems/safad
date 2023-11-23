/**
 * Computes the footprints of each rpc in the recipe.
 */

import reduceDiet from "@/lib/rpc-reducer";
import ResultsEngine from "@/lib/ResultsEngine";

import rpcNamesJson from "@/data/rpc-names.json";

import * as DefaultInputFiles from "../default-input-files";

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
    France: await DefaultInputFiles.parsed.diet("FR"),
    Germany: await DefaultInputFiles.parsed.diet("DE"),
    Greece: await DefaultInputFiles.parsed.diet("GR"),
    Hungary: await DefaultInputFiles.parsed.diet("HU"),
    Ireland: await DefaultInputFiles.parsed.diet("IE"),
    Italy: await DefaultInputFiles.parsed.diet("IT"),
    Spain: await DefaultInputFiles.parsed.diet("ES"),
    Sweden: await DefaultInputFiles.parsed.diet("SE"),
    SwedenBaseline: await DefaultInputFiles.parsed.diet("SE-B"),
  } as Record<string, Diet>;

  const processesAndPackagingCsvData =
    await DefaultInputFiles.parsed.preparationProcessesAndPackaging();

  const recipes = await DefaultInputFiles.parsed.foodsRecipes();

  const RE = new ResultsEngine();
  RE.setFoodsRecipes(recipes);
  RE.setFootprintsRpcs(await DefaultInputFiles.parsed.footprintsRpcs());
  RE.setEmissionsFactorsPackaging(
    await DefaultInputFiles.parsed.emissionsFactorsPackaging()
  );
  RE.setEmissionsFactorsEnergy(
    await DefaultInputFiles.parsed.emissionsFactorsEnergy()
  );
  RE.setEmissionsFactorsTransport(
    await DefaultInputFiles.parsed.emissionsFactorsTransport()
  );
  RE.setProcessesEnergyDemands(
    await DefaultInputFiles.parsed.processesEnergyDemands()
  );
  RE.setPrepProcessesAndPackaging(processesAndPackagingCsvData);

  const allResults = LL_COUNTRIES.map((country) => {
    const subDiets = dietFiles[country].map(([code, amount]) => [
      code,
      amount,
      reduceDiet([[code, amount]], recipes, processesAndPackagingCsvData)[0],
    ]);

    const subDietRows: string[] = [];
    subDiets.forEach(([code, amount, rpcs]) => {
      const rpcs_ = rpcs as Diet;
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
