import { computed, type Ref } from "vue";

import dietNamesJson from "@/data/diet-names.json";

const dietNames = dietNamesJson as Record<
  string,
  {
    country: string;
    surveyName: string;
    ageClass: string;
  }
>;

const readableDietName = (countryCode: string) => {
  const data = dietNames[countryCode];
  return `${data.surveyName}, average diet of ${data.ageClass.toLowerCase()} in ${data.country}`;
};

const dietName = (countryCodeRef: Ref<string>) =>
  computed(() => readableDietName(countryCodeRef.value));

export default dietName;
