/**
 * Computes the impacts of each RPC in the recipe.
 */

import {
  getRpcCodeSubset,
  listAllProcesses,
  maybeQuoteValue,
} from "@/lib/utils";
import { AGGREGATE_HEADERS, aggregateImpacts } from "@/lib/impacts-csv-utils";

import categoryNamesJson from "@/data/category-names.json";
import namesJson from "@/data/rpc-names.json";

import ResultsEngine from "@/lib/ResultsEngine";
import { LL_COUNTRY_CODES } from "../constants";
import * as DefaultFilesImporter from "../default-files-importer";

type LlCountryName =
  | "France"
  | "Germany"
  | "Greece"
  | "Hungary"
  | "Ireland"
  | "Italy"
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

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

export default async function computeFootprintsForEachRpcWithOrigin(
  envFactors?: RpcFootprintsByOrigin
): Promise<string[][]> {
  const foodsRecipes = await DefaultFilesImporter.foodsRecipes();
  const codesInRecipes = new Set(Object.keys(foodsRecipes));
  Object.values(foodsRecipes).forEach((recipe: FoodsRecipe) => {
    recipe.forEach((component) => {
      const code = component[0];
      codesInRecipes.add(code);
    });
  });

  const rpcFiles = {
    France: await DefaultFilesImporter.rpcOriginWaste("FR"),
    Germany: await DefaultFilesImporter.rpcOriginWaste("DE"),
    Greece: await DefaultFilesImporter.rpcOriginWaste("GR"),
    Hungary: await DefaultFilesImporter.rpcOriginWaste("HU"),
    Ireland: await DefaultFilesImporter.rpcOriginWaste("IE"),
    Italy: await DefaultFilesImporter.rpcOriginWaste("IT"),
    Spain: await DefaultFilesImporter.rpcOriginWaste("ES"),
    Sweden: await DefaultFilesImporter.rpcOriginWaste("SE"),
    SwedenBaseline: await DefaultFilesImporter.rpcOriginWaste("SE"),
  } as Record<LlCountryName, RpcOriginWaste>;

  const header = [
    "Code",
    "Name",
    "L1 Category",
    "L2 Category",
    "% Waste (Retail- and consumer)",
    ...AGGREGATE_HEADERS,
    "Processes",
    "Packeting",
  ];

  const names = namesJson as Record<string, string>;

  const RE = new ResultsEngine();

  RE.setFoodsRecipes(await DefaultFilesImporter.foodsRecipes());
  RE.setFootprintsRpcs(
    envFactors || (await DefaultFilesImporter.footprintsRpcs())
  );
  RE.setEmissionsFactorsPackaging(
    await DefaultFilesImporter.emissionsFactorsPackaging()
  );
  RE.setEmissionsFactorsEnergy(
    await DefaultFilesImporter.emissionsFactorsEnergy()
  );
  RE.setEmissionsFactorsTransport(
    await DefaultFilesImporter.emissionsFactorsTransport()
  );
  RE.setProcessesEnergyDemands(
    await DefaultFilesImporter.processesEnergyDemands()
  );
  RE.setPrepProcessesAndPackaging(
    await DefaultFilesImporter.preparationProcessesAndPackaging()
  );

  const syncWasteFiles = Object.fromEntries(
    await Promise.all(
      LL_COUNTRIES.map(
        async (
          country: LlCountryName
        ): Promise<[string, Record<string, number[]>]> => {
          const wasteCountryCode =
            country === "SwedenBaseline" ? "SE" : LL_COUNTRY_CODES[country];
          const wasteFactors =
            await DefaultFilesImporter.wasteRetailAndConsumer(wasteCountryCode);
          return [country, wasteFactors];
        }
      )
    )
  );

  const results = LL_COUNTRIES.map((countryName) => {
    if (countryName === "SwedenBaseline") {
      RE.setCountryCode("SE");
      RE.setWasteRetailAndConsumer(syncWasteFiles["Sweden"]);
    } else {
      RE.setCountryCode(LL_COUNTRY_CODES[countryName]);
      RE.setWasteRetailAndConsumer(syncWasteFiles[countryName]);
    }

    const rpcParameters = rpcFiles[countryName];
    RE.setRpcOriginWaste(rpcParameters);

    const impactsPerDiet = [...codesInRecipes]
      .sort()
      .map((code) => {
        const impacts = RE.computeImpacts([[code, 1000]]);
        if (impacts === null) {
          return null;
        }
        const [
          rpcImpacts,
          processImpacts,
          packagingImpacts,
          transportEmissions,
        ] = impacts;
        const processes = listAllProcesses(processImpacts).join("$");
        const packeting = listAllProcesses(packagingImpacts).join("$");

        return [
          code,
          maybeQuoteValue(names[code] || "NAME NOT FOUND"),
          maybeQuoteValue(getCategoryName(code, 1)),
          maybeQuoteValue(getCategoryName(code, 2)),
          "TODO",
          ...aggregateImpacts(
            rpcImpacts,
            processImpacts,
            packagingImpacts,
            transportEmissions
          ),
          processes,
          packeting,
        ];
      })
      .filter((x): x is string[] => x !== null);

    const impactsCsv = impactsPerDiet.map((row) => row.join(",")).join("\n");

    return [countryName, header.join(",") + "\n" + impactsCsv];
  });

  return results;
}
