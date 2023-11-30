import { ENV_IMPACTS_ZERO } from "@/lib/constants";
import { parseCsvFile, roundToPrecision } from "@/lib/utils";

const isNumerical = (str: string) => {
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode < 48 || charCode > 57) return false;
  }
  return true;
};

const asNumber = (str: string, elseValue = 0): number => {
  const maybeNumber = Number.parseFloat((str || "").trim());
  return Number.isNaN(maybeNumber) ? elseValue : maybeNumber;
};

const asNumbers = (strs: string[], elseValue: number = 0): number[] =>
  strs.map((x) => asNumber(x, elseValue));

function ensureLength<T>(values: T[], length: number, elseValue: T) {
  if (values.length === length) return values;

  return Array.from({ length }).map((_none, i) => values[i] || elseValue);
}

export function parseEmissionsFactorsPackaging(csvString: string) {
  const data = parseCsvFile(csvString)
    // Remove any empty rows
    .filter((row) => row.some((cell) => cell.length > 0))
    .slice(1, 10);

  const result = Object.fromEntries(
    data
      // Convert the strings to numbers
      .map(([pType, ...efs]) => [pType, efs.map((x): number => asNumber(x))])
      // Ensure exactly 3 emissions factors
      .map(([pType, efs]) => [pType, ensureLength(efs as number[], 3, 0)])
  );

  const expectedPackagingTypes = [
    "P1",
    "P2",
    "P3",
    "P4",
    "P5",
    "P6",
    "P7",
    "P8",
    "P9",
  ];

  const missingPackagingTypes = expectedPackagingTypes.filter(
    (pType) => !(pType in result)
  );
  if (missingPackagingTypes.length > 0) {
    const prefix = "Error validating file, Emissions Factors for Packaging. ";
    throw new Error(
      prefix +
        `Packaging types were missing in 1st col: ${missingPackagingTypes.join(
          ", "
        )}`
    );
  }

  return result;
}

export function parseEmissionsFactorsEnergy(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1); // Drop Header

  const emissionsFactors: Record<string, number[] | Record<string, number[]>> =
    { Electricity: {} };

  csv.forEach(([carrier, _country, countryCode, ...ghgsStrs]) => {
    const ghgs = asNumbers(ghgsStrs);
    if (carrier === "Electricity") {
      (emissionsFactors[carrier] as Record<string, number[]>)[countryCode] =
        ensureLength(ghgs, 3, 0);
    } else {
      emissionsFactors[carrier] = ensureLength(ghgs, 3, 0);
    }
  });

  const expectedCarrierTypes = [
    "Electricity",
    "Heating oil",
    "Natural gas",
    "Other fossil energy sources",
    "Bark and chips",
    "Pellets and briquettes",
    "Other renewable energy sources",
    "Diesel fuel",
    "District heating",
  ];

  const missingCarrierTypes = expectedCarrierTypes.filter(
    (carrier) => !(carrier in emissionsFactors)
  );
  if (missingCarrierTypes.length > 0) {
    const prefix = "Error validating file, Emissions Factors for Energy. ";
    throw new Error(
      prefix + `Carrier types were missing: ${missingCarrierTypes.join(", ")}`
    );
  }

  return emissionsFactors;
}

export function parseEmissionsFactorsTransport(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1); // Drop Header

  const results: NestedRecord<string, number[]> = {};

  csv.forEach(
    ([
      consumptionCountryCode,
      _consumptionCountry,
      productionCountryCode,
      _productionCountry,
      ...ghgsStrs
    ]) => {
      const ghgs = ensureLength(asNumbers(ghgsStrs), 4, 0);

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

  return Object.fromEntries(
    csv.map(([code, _processName, _totalEnergy, _note, ...demandsStrs]) => {
      // Convert from strings to numbers
      const demands = asNumbers(demandsStrs);
      return [code, ensureLength(demands, 11, 0)];
    })
  );
}

export function parseProcessesPackaging(csvString: string) {
  const data = parseCsvFile(csvString).slice(1);

  const packagingData = Object.fromEntries(
    data
      .map((row) => [row[0], row[7]])
      // Skip all packaging values that are not "P1", "P2", ..., "P9"
      .filter(
        (pair) =>
          pair[1].length === 2 &&
          pair[1].charAt(0) === "P" &&
          isNumerical(pair[1].charAt(1))
      )
  );
  const preparationProcessesData = Object.fromEntries(
    data
      .map((row) => [row[2], row[4]])
      // Most rows will be empty, and that's fine. Ignore them.
      .filter((pair) => pair[1] !== "")
  );

  return { ...packagingData, ...preparationProcessesData };
}

export function parseFootprintsRpcs(csvString: string) {
  const data = parseCsvFile(csvString).slice(1);
  const EXPECTED_LENGTH = 16;

  const structured = {} as RpcFootprintsByOrigin;

  data
    .filter((x) => x.length > 1)
    .map(
      ([_i, code, _name, _category, _originName, originCode, ...impacts]) => [
        code,
        originCode,
        ...impacts,
      ]
    )
    .forEach(([code, originCode, ...impactsStr]) => {
      if (code === "NA") return;

      // Handle the base-case, i.e. the initial acc.
      if (!(code in structured)) {
        structured[code] = {};
      }

      // Avoid any inconsistent casing causing trouble.
      if (originCode.toLowerCase() === "row") {
        originCode = "RoW";
      }

      structured[code][originCode] = ensureLength(
        asNumbers(impactsStr),
        EXPECTED_LENGTH,
        0
      );
    });

  // Assing the average value as the "RoW"
  Object.entries(structured).forEach(([suaCode, factorsPerOrigin]) => {
    // Abort if RoW already is defined, i.e. avoid overwriting it
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
    {} as RpcOriginWaste
  );
}

export function parseFoodsRecipes(recipesCsvStr: string) {
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
          (asNumber(perc, 1) * asNumber(prob, 1)) / 100,
          3
        );

        if (value === 0) return;

        const netYieldFactor =
          asNumber(yieldFactor, 1) * asNumber(allocationFactor, 1);

        const PROCESS_UNSPECIFIED = "F28.A07XD";
        const processes = facetStr
          .split("$")
          .filter((f) => f.startsWith("F28.") && f !== PROCESS_UNSPECIFIED);

        const entry: [string, string[], number, number] = [
          component,
          processes,
          value,
          netYieldFactor,
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
