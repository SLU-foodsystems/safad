import foodsData from "../data/foods.json";

export const data = foodsData.data as EAT[];

// IDs
export const eatIds = data.map((eat) => eat.id);
export const fbsIds = data.flatMap((eat) => eat.fbs.map((fbs) => fbs.id));
export const suaIds = data.flatMap((eat) =>
  eat.fbs.flatMap((fbs) => fbs.sua.map((sua) => sua.id))
);

const suaToFbsMap = new Map();
data.forEach((eat) => {
  eat.fbs.forEach((fbs) => {
    fbs.sua.forEach((sua) => {
      suaToFbsMap.set(sua.id, fbs.id);
    });
  });
});

/**
 * Get the FBS id that a given SUA id belongs to
 */
export const suaToFbsId = (suaId: string) => suaToFbsMap.get(suaId);
