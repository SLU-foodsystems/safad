/**
 * Generate a dummy diet csv file
 *
 */

const { data: eatGroups } = require("../src/data/foods.json");

const suaIds = eatGroups.flatMap((eat) =>
  eat.fbs.flatMap((fbs) => fbs.sua.map((sua) => sua.id))
);

const suaToFbs = {};
eatGroups.forEach((eat) => {
  eat.fbs.forEach((fbs) => {
    fbs.sua.forEach((sua) => {
      suaToFbs[sua.id] = fbs.id;
    });
  });
});

const COUNTRIES = ["es", "uk", "de", "dk", "ir", "se", "fr"];

const r = {
  p: (min = 0, max = 100) => (min + (max - min) * Math.random()).toFixed(2),
  country: () => COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
  amount: () =>
    (Math.random() > 0.1
      ? 1000 * Math.random() + 700 * Math.round(Math.random() / 4)
      : 0
    ).toFixed(2),
  origin: (max = 5) => {
    const n = 1 + Math.floor(Math.random() * max);

    const res = {};
    let tot = 0;
    for (let i = 0; i < n; i++) {
      const val = i === n - 1 ? 100 - tot : Math.random() * (100 - tot);
      tot += val;
      let ctry;
      do {
        ctry = r.country();
      } while (ctry in res);
      res[ctry] = val;
    }

    return Object.entries(res)
      .map(([k, v]) => `${k}:${v.toFixed(2)}`)
      .join(" ");
  },
};

const treatedFbsIds = new Set();
const csvData = suaIds.map((suaId) => {
  const fbsId = suaToFbs[suaId];

  if (treatedFbsIds.has(fbsId)) {
    return [suaId, fbsId, r.amount(), r.p(), "", "", "", "", ""];
  }

  treatedFbsIds.add(fbsId);

  return [
    suaId,
    fbsId,
    r.amount(),
    r.p(), // Organic
    r.p(), // Waste 1
    r.p(), // Waste 2
    r.p(), // Waste 3
    r.p(), // Tech impr.
    r.origin(),
  ].join(",");
});

const HEADER = [
  "SUA ID",
  "FBS ID",
  "Amount (g)",
  "Organic (%)",
  "Production waste (%)",
  "Retail waste (%)",
  "Consumer waste (%)",
  "Technical Improvement (% y/y)",
  "Origin",
].join(",");

console.log(HEADER + "\n" + csvData.join("\n"));
