import emissionsFactorsPackagingUrl from "@/default-input-files/emissions-factors-packaging.csv?url";
import { parseEmissionsFactorsPackaging } from "./input-files-parsers";

export async function emissionsFactorsPackaging() {
  const csvString = await fetch(emissionsFactorsPackagingUrl).then((res) => {
    if (!res.ok) {
      throw new Error(res.statusText);
    }

    return res.text();
  });

  return parseEmissionsFactorsPackaging(csvString);
}
