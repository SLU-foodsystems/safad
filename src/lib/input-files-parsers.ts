import { parseCsvFile, roundToPrecision, vectorsSum } from "@/lib/utils";

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

  const results: NestedRecord<string, number[]> = {};

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

export function parseProcessesPackaging(
  csvString: string
): Record<string, string[]> {
  const data = parseCsvFile(csvString).slice(1);
  const splitFacetStr = (str: string) =>
    (str || "").split("$").filter((x) => x.length > 0 && x !== "NA");

  const packagingData = Object.fromEntries(
    data.map((row) => [row[0], splitFacetStr(row[7])])
  );
  const preparationProcessesData = Object.fromEntries(
    data
      .map((row) => [row[2], splitFacetStr(row[4])])
      .filter((pair) => pair[1].length > 0)
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
        rpcCode,
        _foodEx2Code,
        _name,
        _suaCode,
        _suaName,
        _category,
        _originName,
        originCode,
        ...impactsStr
      ]) => {
        if (!rpcCode || rpcCode.trim() === "NA") return;

        // Handle the base-case, i.e. the initial acc.
        if (!(rpcCode in structured)) {
          structured[rpcCode] = {};
        }

        if (originCode.toLowerCase().trim() === "row") {
          originCode = "RoW";
        }

        structured[rpcCode][originCode] = impactsStr.map((x) => {
          const val = parseFloat(x);
          return Number.isNaN(val) ? 0 : val;
        });

        while (structured[rpcCode][originCode].length < EXPECTED_LENGTH) {
          structured[rpcCode][originCode].push(0);
        }
      }
    );

  // Set RoW to be the average
  Object.entries(structured).forEach(([rpcCode, factorsPerOrigin]) => {
    // Abort if RoW already is defined
    if (Object.keys(factorsPerOrigin).includes("RoW")) return;

    const numberOfOrigins = Object.values(factorsPerOrigin).length;
    const average = vectorsSum(Object.values(factorsPerOrigin)).map(
      (x: number) => x / numberOfOrigins
    );

    structured[rpcCode].RoW = average;
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

  return data.map(
    ([code, _name, amount]): FoodEntry => [code, asNumber(amount)]
  );
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
      [rpcCode, _name, _originName, originCode, originShare, productionWaste]
    ) => {
      // First time we see this RPC code? Add an empty object, which we will
      // populate with one obj per origin
      if (!(rpcCode in acc)) {
        acc[rpcCode] = {};
      }

      acc[rpcCode][originCode] = [
        asNumber(originShare),
        asNumber(productionWaste),
      ];

      // Pass the acc along.
      return acc;
    },
    {} as RpcOriginWaste
  );
}

export function parseFoodsRecipes(recipesCsvStr: string) {
  function removeCorruptValues(obj: FoodsRecipes) {
    Object.entries(obj).forEach(([id, _values]) => {
      obj[id] = obj[id].filter(
        // Remove all cases where the rpc code is "", which can happen for
        // empty rows, etc.
        ([foodCode]) => foodCode && foodCode !== ""
      );
    });
  }

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

  removeCorruptValues(recipes);
  removeNullSelfReferences(recipes);
  deleteEmptyValues(recipes);

  return recipes;
}

export function parseSlvRecipes(recipesCsvStr: string): SlvRecipeComponent[] {
  const data: string[][] = parseCsvFile(recipesCsvStr).slice(1);

  const processTranslations: Record<string, string> = {
    "Juice drickfärdig": "F28.A07LN",
    "Rå, tillagad": "F28.A0BA1",
    Tillagad: "F28.A0BA1",
    "Tillagad, adderad": "F28.A0BA1",
    "Pure ": "F28.A0C6N",
    Pulveriserat: "F28.A07KF",
    "Juice koncentrerad": "F28.A07KF",
    Torkad: "F28.A07KG",
    Friterad: "F28.A07GV",
  };

  return (
    data
      .map(
        ([
          slvCode,
          slvName,
          _i1Name,
          i1Share,
          _i1Desc,
          i1ProcessName,
          _i1YieldFactor,
          _i1PublicationSource,
          i1FoodEx2Code,
          i1NetShare,
          _i1NetAmountDesc,
          _i2Name,
        ]) => ({
          slvCode,
          slvName,
          foodEx2Code: i1FoodEx2Code,
          process: processTranslations[i1ProcessName] || "",
          grossShare: asNumber(i1Share, 0) / 100,
          netShare: asNumber(i1NetShare, 0) / 100,
        })
      )
      // Skip any ingredients with a 0-value
      .filter((x) => x.grossShare > 0 && x.netShare > 0)
  );
}
