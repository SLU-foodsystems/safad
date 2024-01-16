import { readCsv } from "./utils.mjs";

function main(args) {
  const fileName = args[0];

  const suaToRpcs = {};
  const rpcNames = {};
  readCsv("./rpc-to-sua.csv")
    .slice(1)
    .map(([_foodexCode, rpcCode, rpcName, suaCode]) => {
      if (!suaToRpcs[suaCode]) {
        suaToRpcs[suaCode] = [];
      }

      suaToRpcs[suaCode].push(rpcCode);
      rpcNames[rpcCode] = rpcName;
    });

  const HEADER = [
    "RPC Code",
    "RPC Name",
    "Producer Country Name",
    "Producer Country Code",
    "Share",
    "Waste",
    "SUA Code",
  ].join(",");

  const csvRows = [];

  const fishies = {
    A02DE: "BF-01",
    A02ES: "BF-02",
    A02DH: "BF-03",
    A02DB: "BF-04",
    A02DD: "BF-05",
    A029M: "BF-06",
    A029B: "BF-07",
    A029Q: "BF-08",
    A027N: "BF-09",
    A029T: "BF-10",
    A02CT: "BF-11",
    A02DR: "BF-12",
    A02AD: "BF-13",
    A02CB: "BF-14",
    A02AT: "BF-15",
    A02AY: "BF-16",
    A02BC: "BF-17",
    A02BF: "BF-18",
    A027C: "BF-19",
    A027B: "BF-20",
    A028G: "BF-21",
    A02BJ: "BF-22",
    A02DJ: "BF-23",
    A02DQ: "BF-24",
    A02FA: "BF-25",
    A02DS: "BF-26",
    A02DA: "BF-27",
    A07Y0: "BF-28",
    A02FF: "BF-29",
    A02FP: "BF-30",
    A02FS: "BF-31",
    A02FY: "BF-32",
    A02GA: "BF-33",
    A02FV: "BF-34",
    A02FG: "BF-35",
    A02JH: "BF-36",
    A02JD: "BF-37",
    A02JA: "BF-38",
    A02HA: "BF-39",
    A02HE: "BF-40",
    A02HF: "BF-41",
    A02HG: "BF-42",
    A02HN: "BF-43",
    A02GX: "BF-44",
    A02GX: "BF-45",
    A02KR: "BF-46",
    A02LK: "BF-47",
    A0C75: "BF-48",
    A029F: "BF-49",
    A027J: "BF-50",
    A029Z: "BF-51",
    A02BV: "BF-52",
    A02EL: "BF-53",
    A02EP: "BF-54",
    A02CG: "BF-55",
    A02CA: "BF-56",
    A0F7F: "BF-57",
  };

  readCsv(fileName)
    .slice(1)
    .forEach(([suaCode, _suaName, countryName, countryCode, share, waste]) => {
      const rpcCodes = suaToRpcs[suaCode];
      if (!rpcCodes) {
        return;
      }

      rpcCodes.forEach((rpcCode) => {
        csvRows.push([
          `"${rpcCode}"`,
          `"${rpcNames[rpcCode]}"`,
          `"${countryName}"`,
          `"${countryCode}"`,
          share,
          waste,
          fishies[suaCode] || suaCode
        ]);
      });
    });

  const csv =
    HEADER +
    "\n" +
    csvRows
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((row) => row.join(","))
      .join("\n");

  console.log(csv);
}

main(process.argv.slice(2));
