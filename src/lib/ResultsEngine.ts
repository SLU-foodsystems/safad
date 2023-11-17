import reduceDiet from "./rpc-reducer";
import { ENV_IMPACTS_ZERO } from "./constants";
import {
  computeProcessImpacts,
  getProcessEnvFactors,
} from "./process-emissions";

import rpcToSuaMapJson from "@/data/rpc-to-sua.json";

import flattenEnvironmentalFactors from "./env-impact-aggregator";
import {
  aggregateBy,
  aggregateRpcCategories,
  mapValues,
  vectorSum,
  vectorsSum,
} from "./utils";

import computeTransportEmissions from "./transport-emissions";
import adjustDietForWaste from "./waste-retail-consumer-adjuster";

const rpcToSuaMap = rpcToSuaMapJson as Record<string, string>;

/**
 * Ties all parts of computing the results into a singleton.
 */
class ResultsEngine {
  footprintsRpcsPerOrigin: EnvFactors | null = null;
  footprintsRpcsMerged: EnvImpacts | null = null;

  rpcParameters: RpcFactors | null = null;
  foodsRecipes: null | FoodsRecipes = null;

  countryCode: string | null = null;
  processEnvFactors: Record<string, number[]> | null = null;

  emissionsFactorsPackaging: null | Record<string, number[]> = null;
  emissionsFactorsEnergy: null | Record<
    string,
    number[] | Record<string, number[]>
  > = null;
  emissionsFactorsTransport: null | Record<string, Record<string, number[]>> =
    null;

  processesEnergyDemands: null | Record<string, number[]> = null;
  preparationProcessesAndPackaging: null | Record<string, string> = null;

  wasteRetailAndConsumer: null | Record<string, number[]> = null;

  private recomputeEnvFootprints() {
    if (!this.footprintsRpcsPerOrigin) {
      console.info(
        "Method recomputeEnvFootprints called before env factors file was set."
      );
      return;
    }

    if (!this.rpcParameters) {
      console.info(
        "Method recomputeEnvFootprints called before rpcFactors were set."
      );
      return;
    }

    this.footprintsRpcsMerged = flattenEnvironmentalFactors(
      this.footprintsRpcsPerOrigin,
      this.rpcParameters
    );
  }

  public setFootprintsRpcs(footprintsRpcsPerOrigin: EnvFactors) {
    this.footprintsRpcsPerOrigin = footprintsRpcsPerOrigin;
    this.recomputeEnvFootprints();
  }

  public setWasteRetailAndConsumer(
    wasteRetailAndConsumer: Record<string, number[]>
  ) {
    this.wasteRetailAndConsumer = wasteRetailAndConsumer;
  }

  public setFoodsRecipes(foodsRecipes: FoodsRecipes) {
    this.foodsRecipes = foodsRecipes;
  }

  private getRpcFootprints(
    rpcCode: string,
    amountGram: number
  ): null | number[] {
    if (!this.footprintsRpcsMerged) {
      throw new Error("getEnvImpact called before sheets were assigned.");
    }

    if (!this.rpcParameters) {
      throw new Error(
        "getEnvImpact called before rpcParameters were assigned."
      );
    }

    const suaCode = rpcToSuaMap[rpcCode];
    if (suaCode === "0") {
      return ENV_IMPACTS_ZERO;
    }

    if (!suaCode) {
      // console.warn(`No SUA code found for rpc ${rpcCode}`);
      return null;
    }

    if (!this.footprintsRpcsMerged[suaCode]) {
      // console.warn(`Missing factors for ${rpcCode} (${suaCode})`);
      return ENV_IMPACTS_ZERO;
    }

    return this.footprintsRpcsMerged[suaCode].map(
      (x) => (x * amountGram) / 1000
    );
  }

  // Set the rpc-factors, i.e. the origin of each rpc, its share, and its
  // production waste.
  public setRpcFactors(rpcFactors: RpcFactors) {
    this.rpcParameters = rpcFactors;
    this.recomputeEnvFootprints();
  }

  private attemptUpdateProcessEmissionsFactors() {
    if (
      this.countryCode &&
      this.emissionsFactorsEnergy &&
      this.processesEnergyDemands
    ) {
      this.processEnvFactors = getProcessEnvFactors(
        this.countryCode,
        this.processesEnergyDemands,
        this.emissionsFactorsEnergy
      );
    }
  }

  public setCountryCode(countryCode: string) {
    this.countryCode = countryCode;
    this.attemptUpdateProcessEmissionsFactors();
  }

  public setEmissionsFactorsEnergy(
    emissionsFactorsProcesses: Record<
      string,
      number[] | Record<string, number[]>
    >
  ) {
    this.emissionsFactorsEnergy = emissionsFactorsProcesses;
    this.attemptUpdateProcessEmissionsFactors();
  }

  public setProcessesEnergyDemands(
    processesEnergyDemands: Record<string, number[]>
  ) {
    this.processesEnergyDemands = processesEnergyDemands;
    this.attemptUpdateProcessEmissionsFactors();
  }

  public setEmissionsFactorsPackaging(
    emissionsFactorsPackaging: Record<string, number[]>
  ) {
    this.emissionsFactorsPackaging = emissionsFactorsPackaging;
  }

  public setEmissionsFactorsTransport(
    emissionsFactorsTransport: Record<string, Record<string, number[]>>
  ) {
    this.emissionsFactorsTransport = emissionsFactorsTransport;
  }

  public setPrepProcessesAndPackaging(
    processesAndPackaging: Record<string, string>
  ) {
    this.preparationProcessesAndPackaging = processesAndPackaging;
  }

  public computeImpacts(
    diet: [string, number][]
  ):
    | null
    | [
        Record<string, number[]>,
        Record<string, Record<string, number[]>>,
        Record<string, Record<string, number[]>>,
        Record<string, number[]>
      ] {
    if (!this.footprintsRpcsPerOrigin) {
      console.error(
        "Compute called when no environmentalFactorsSheet was set."
      );
      return null;
    }

    if (!this.foodsRecipes) {
      console.error("Compute called without foodsRecipes.");
      return null;
    }

    if (!this.wasteRetailAndConsumer) {
      console.error(
        "Compute called without retail- and consumer waste factors set."
      );
      return null;
    }

    if (!this.rpcParameters) {
      console.error("Compute called when no rpcParameters were set.");
      return null;
    }

    if (!this.countryCode || !this.processEnvFactors) {
      console.error("Compute called when no country or process was set.");
      return null;
    }

    if (!this.emissionsFactorsPackaging) {
      console.error(
        "Compute called without emissions factors for packaging set."
      );
      return null;
    }

    if (!this.emissionsFactorsTransport) {
      console.error(
        "Compute called without emissions factors for transport set."
      );
      return null;
    }

    if (!this.preparationProcessesAndPackaging) {
      console.error("Compute called without processes and packaging set.");
      return null;
    }

    const dietWithWaste = adjustDietForWaste(diet, this.wasteRetailAndConsumer);

    const [
      rpcAmounts,
      processesAmounts,
      packetingAmounts,
      transportlessAmounts,
    ] = reduceDiet(
      dietWithWaste,
      this.foodsRecipes,
      this.preparationProcessesAndPackaging
    );

    const rpcImpacts = Object.fromEntries(
      rpcAmounts
        .map(([rpc, amountGram]) => [
          rpc,
          this.getRpcFootprints(rpc, amountGram),
        ])
        .filter((x) => x[1] !== null)
    );

    // Per-process impacts
    const processesEnvImpacts = computeProcessImpacts(
      processesAmounts,
      this.processEnvFactors
    );

    // Map the packetingAmounts to their respective emission factors
    const packagingEnvImpacts = mapValues(packetingAmounts, (amounts) =>
      Object.fromEntries(
        Object.entries(amounts).map(([packetingId, amount]) => [
          packetingId,
          this.emissionsFactorsPackaging![packetingId].map(
            (x) => (x * amount) / 1000
          ),
        ])
      )
    );

    // Transport impacts
    const transportEnvImpactsEntries = rpcAmounts
      .map(([rpcCode, amount]) => [
        rpcCode,
        computeTransportEmissions(
          rpcToSuaMap[rpcCode],
          amount - (transportlessAmounts[rpcCode] || 0),
          this.rpcParameters!,
          this.emissionsFactorsTransport![this.countryCode!],
          this.countryCode!
        ),
      ])
      .filter((pair): pair is [string, number[]] => pair[1] !== null);

    const transportEnvImpacts = aggregateBy<number[]>(
      transportEnvImpactsEntries,
      (x) => x,
      vectorSum
    );

    return [
      rpcImpacts,
      processesEnvImpacts,
      packagingEnvImpacts,
      transportEnvImpacts,
    ];
  }

  public computeImpactsByCategory(diet: [string, number][]) {
    const impacts = this.computeImpacts(diet);
    if (!impacts) return null;

    const [rpcImpacts, processImpacts, packagingImpacts, transportImpacts] =
      impacts;

    const rpcImpactsByCategory = aggregateRpcCategories(rpcImpacts, 1);
    const processImpactsByCategory = mapValues(
      processImpacts,
      (perCategoryProcesses) => vectorsSum(Object.values(perCategoryProcesses))
    );
    const packagingImpactsByCategory = mapValues(
      packagingImpacts,
      (perCategoryPackaging) => vectorsSum(Object.values(perCategoryPackaging))
    );
    const transportImpactsByCategory = aggregateRpcCategories(
      transportImpacts,
      1
    );

    return [
      rpcImpactsByCategory,
      processImpactsByCategory,
      packagingImpactsByCategory,
      transportImpactsByCategory,
    ];
  }
}

export default ResultsEngine;
