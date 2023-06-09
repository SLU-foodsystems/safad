#!/usr/bin/env node

import fs from "fs";
import * as utils from "./utils.mjs";
import envFactorsJson from "../src/data/env-factors.json" assert { type: "json" };

import rpcFactorsFrance from "../src/data/rpc-parameters/France-rpc.json" assert { type: "json" };
import rpcFactorsGermany from "../src/data/rpc-parameters/Germany-rpc.json" assert { type: "json" };
import rpcFactorsGreece from "../src/data/rpc-parameters/Greece-rpc.json" assert { type: "json" };
import rpcFactorsHungary from "../src/data/rpc-parameters/Hungary-rpc.json" assert { type: "json" };
import rpcFactorsIreland from "../src/data/rpc-parameters/Ireland-rpc.json" assert { type: "json" };
import rpcFactorsItaly from "../src/data/rpc-parameters/Italy-rpc.json" assert { type: "json" };
import rpcFactorsPoland from "../src/data/rpc-parameters/Poland-rpc.json" assert { type: "json" };
import rpcFactorsSpain from "../src/data/rpc-parameters/Spain-rpc.json" assert { type: "json" };
import rpcFactorsSweden from "../src/data/rpc-parameters/Sweden-rpc.json" assert { type: "json" };

const LL_COUNTRIES = [
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Poland",
  "Spain",
  "Sweden",
];

const rpcFactorFiles = {
  France: rpcFactorsFrance,
  Germany: rpcFactorsGermany,
  Greece: rpcFactorsGreece,
  Hungary: rpcFactorsHungary,
  Ireland: rpcFactorsIreland,
  Italy: rpcFactorsItaly,
  Poland: rpcFactorsPoland,
  Spain: rpcFactorsSpain,
  Sweden: rpcFactorsSweden,
};

const maybeQuote = (str) => (str && str.includes(",") ? `"${str}"` : str);

async function main() {
  const envFactors = envFactorsJson.data;
  const suaCodes = Object.keys(envFactors);

  const body = suaCodes
    .map((suaCode) => {
      const envCountries = Object.keys(envFactors[suaCode]);
      const missing = LL_COUNTRIES.map((country) => {
        const factors = rpcFactorFiles[country].data[suaCode];
        const factorsCountries = factors ? Object.keys(factors) : [];
        return factorsCountries
          .filter((c) => !envCountries.includes(c))
          .map((x) => maybeQuote(x))
          .join(", ");
        // console.log(countries)
      });
      if (missing.every((x) => x.length === 0)) return null;

      return [
        suaCode,
        envCountries.map((c) => maybeQuote(c)).join(", "),
        ...missing,
      ].join(";");
    })
    .filter((x) => x !== null)
    .join("\n");

  const header = [
    "SUA CODE",
    "Länder i miljödatan",
    ...LL_COUNTRIES.map((x) => "Saknas för " + x),
  ].join(";");
  console.log(header + "\n" + body);
}

main();
