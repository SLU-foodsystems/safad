import { ENV_IMPACTS_ZERO } from "@/lib/constants";
import { parseCsvFile, roundToPrecision } from "@/lib/utils";

const asNumber = (str: string, elseValue = 0): number => {
  const maybeNumber = Number.parseFloat((str || "").trim());
  return Number.isNaN(maybeNumber) ? elseValue : maybeNumber;
};

export function parseEmissionsFactorsPackaging(csvString: string) {
  const array = parseCsvFile(csvString)
    // Remove any empty rows
    .filter((row) => row.some((cell) => cell.length > 0))
    .slice(1, 10);

  // TODO: Check if missing rows
  // TODO: Check if invalid packaging types

  return Object.fromEntries(
    array.map(([pType, ...efs]) => [
      pType,
      efs.map((x) => Number.parseFloat(x)),
    ])
  );
}

export function parseEmissionsFactorsEnergy(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1); // Drop Header

  const emissionsFactors: Record<string, number[] | Record<string, number[]>> =
    { Electricity: {} };

  csv
    .map((row) => row.map((x) => x.trim()))
    .forEach(([carrier, _country, countryCode, ...ghgsStrs]) => {
      const ghgs = ghgsStrs.map((x) => (x ? parseFloat(x) : 0));
      if (carrier === "Electricity") {
        (emissionsFactors[carrier] as Record<string, number[]>)[countryCode] =
          ghgs;
      } else {
        emissionsFactors[carrier] = ghgs;
      }
    });

  return emissionsFactors;
}

export function parseEmissionsFactorsTransport(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1); // Drop Header

  const results: Record<string, Record<string, number[]>> = {};

  csv
    .map((row) => row.map((x) => x.trim())) // Trim all fields
    .forEach(
      ([
        consumptionCountryCode,
        _consumptionCountry,
        productionCountryCode,
        _productionCountry,
        ...ghgsStrs
      ]) => {
        // Convert all GHG factors to numbers, falling back to 0 if missing
        const ghgs = ghgsStrs
          .map((x) => (x ? parseFloat(x) : 0))
          .map((x) => (Number.isNaN(x) ? 0 : x));

        if (!(consumptionCountryCode in results)) {
          results[consumptionCountryCode] = {};
        }

        results[consumptionCountryCode][productionCountryCode] = ghgs;
      }
    );

  return results;
}

export function parseProcessesEnergyDemands(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1);

  // TODO: ensure length of demandsStrs is correct
  return Object.fromEntries(
    csv.map(([code, _processName, _totalEnergy, _note, ...demandsStrs]) => {
      // Covnert from strings to numbers
      const demands = demandsStrs.map((x) => {
        const val = Number.parseFloat(x) || 0;
        return Number.isNaN(x) ? 0 : val;
      });
      return [code, demands];
    })
  );
}

export function parseProcessesPackaging(csvString: string) {
  const data = parseCsvFile(csvString).slice(1);

  const packagingData = Object.fromEntries(data.map((row) => [row[0], row[7]]));
  const preparationProcessesData = Object.fromEntries(
    data.map((row) => [row[2], row[4]]).filter((pair) => pair[1] !== "")
  );

  return { ...packagingData, ...preparationProcessesData };
}

export function parseFootprintsRpcs(csvString: string) {
  const data = parseCsvFile(csvString).slice(1);
  const EXPECTED_LENGTH = 16;

  const structured = {} as RpcFootprintsByOrigin;

  data
    .filter((x) => x.length > 1)
    .forEach(
      ([
        _i,
        code,
        _name,
        _category,
        _originName,
        originCode,
        ...impactsStr
      ]) => {
        if (code.trim() === "NA") return;

        // Handle the base-case, i.e. the initial acc.
        if (!(code in structured)) {
          structured[code] = {};
        }

        if (originCode.toLowerCase().trim() === "row") {
          originCode = "RoW";
        }

        structured[code][originCode] = impactsStr.map((x) => {
          const val = parseFloat(x);
          return Number.isNaN(val) ? 0 : val;
        });

        while (structured[code][originCode].length < EXPECTED_LENGTH) {
          structured[code][originCode].push(0);
        }
      }
    );

  // Set RoW to be the average
  Object.entries(structured).forEach(([suaCode, factorsPerOrigin]) => {
    // Abort if RoW already is defined
    if (Object.keys(factorsPerOrigin).includes("RoW")) return;

    const numberOfOrigins = Object.values(factorsPerOrigin).length;
    const average = Object.values(factorsPerOrigin)
      // Sum all values together
      .reduce(
        (acc, factors) => acc.map((x, i) => x + factors[i]),
        ENV_IMPACTS_ZERO
      )
      // divide by the number of origins to get an average
      .map((x: number) => x / numberOfOrigins);

    structured[suaCode].RoW = average;
  });

  return structured;
}

export function parseWasteRetailAndConsumer(csvString: string) {
  const data = parseCsvFile(csvString).slice(1);

  return Object.fromEntries(
    data.map(([code, _name, retailWaste, consumerWaste]) => [
      code,
      [asNumber(retailWaste), asNumber(consumerWaste)],
    ])
  );
}

export function parseDiet(csvString: string): Diet {
  const data = parseCsvFile(csvString).slice(1);

  return data.map(([code, _name, amount]): FoodEntry => [
    code,
    asNumber(amount),
  ]);
}

export function parseRpcOriginWaste(csvString: string) {
  const parametersCsv = parseCsvFile(csvString).slice(1);

  // The CSV has each entry as a line. Even though they're probably sorted and
  // grouped together, we're not going to use that structure in this algorithm,
  // to avoid that assumption causing bugs.
  //
  // We will walk through each line, and successively build an object with the
  // desired shape (see header of this file).
  //
  // If we meet the same (code, origin) pair twice, we will simply overwrite it.
  return parametersCsv.reduce(
    (
      acc,
      [suaCode, _name, _originName, originCode, originShare, productionWaste]
    ) => {
      // First time we see this RPC code? Add an empty object, which we will
      // populate with one obj per origin
      if (!(suaCode in acc)) {
        acc[suaCode] = {};
      }

      acc[suaCode][originCode] = [
        asNumber(originShare),
        asNumber(productionWaste),
      ];

      // Pass the acc along.
      return acc;
    },
    {} as RpcFactors
  );
}

export function parseRecipeFile(recipesCsvStr: string) {
  /**
   * Precautionary: Delete any empty rulesets.
   */
  function deleteEmptyValues(obj: FoodsRecipes) {
    Object.entries(obj).forEach(([id, values]) => {
      const nSubComponents = values.length;
      if (nSubComponents === 0) delete obj[id];
    });
  }

  function removeNullSelfReferences(obj: FoodsRecipes) {
    Object.entries(obj).forEach(([id, _values]) => {
      obj[id] = obj[id].filter(
        ([foodCode, process]) => foodCode !== id || process.length > 0
      );
    });
  }

  const recipes: FoodsRecipes = {};

  parseCsvFile(recipesCsvStr)
    .slice(1) // drop header in csv file
    .forEach(
      ([
        code,
        _name,
        component,
        _componentName,
        facetStr,
        _facetDescr,
        perc,
        prob,
        yieldFactor,
        allocationFactor,
      ]) => {
        if (code === "") return; // Empty row
        const value = roundToPrecision(
          (parseFloat(perc) * parseFloat(prob)) / 100,
          3
        );

        const netYieldFactor =
          (parseFloat(yieldFactor) || 1) * (parseFloat(allocationFactor) || 1);

        if (value === 0) return;

        const PROCESS_UNSPECIFIED = "F28.A07XD";
        const processes = facetStr
          .split("$")
          .filter((f) => f.startsWith("F28.") && f !== PROCESS_UNSPECIFIED);

        const entry: [string, string[], number, number] = [
          component,
          processes,
          value,
          netYieldFactor || 1,
        ];

        if (code in recipes) {
          recipes[code].push(entry);
        } else {
          recipes[code] = [entry];
        }
      }
    );

  removeNullSelfReferences(recipes);
  deleteEmptyValues(recipes);

  return recipes;
}
