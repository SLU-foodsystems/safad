import { ENV_IMPACTS_ZERO } from "@/lib/constants";
import { parseCsvFile } from "@/lib/utils";

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

  const structured = {} as EnvFactors;

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
