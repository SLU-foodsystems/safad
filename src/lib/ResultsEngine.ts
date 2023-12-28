import reduceDiet from "./rpc-reducer";
import {
  computeProcessImpacts,
  getProcessEnvFactors,
} from "./process-emissions";

import flattenEnvironmentalFactors from "./env-impact-aggregator";
import {
  aggregateBy,
  aggregateRpcCategories,
  getRpcCodeLevel,
  mapValues,
  vectorSum,
  vectorsSum,
} from "./utils";

import computeTransportEmissions from "./transport-emissions";
import adjustDietForWaste from "./waste-retail-consumer-adjuster";

/**
 * Ties all parts of computing the results into a singleton.
 */
class ResultsEngine {
  footprintsRpcsPerOrigin: null | RpcFootprintsByOrigin = null;
  footprintsRpcsMerged: null | RpcFootprints = null;

  rpcOriginWaste: null | RpcOriginWaste = null;
  foodsRecipes: null | FoodsRecipes = null;

  countryCode: null | string = null;
  processEnvFactors: null | Record<string, number[]> = null;

  emissionsFactorsPackaging: null | Record<string, number[]> = null;
  emissionsFactorsEnergy: null | Record<
    string,
    number[] | Record<string, number[]>
  > = null;
  emissionsFactorsTransport: null | NestedRecord<string, number[]> = null;

  processesEnergyDemands: null | Record<string, number[]> = null;
  preparationProcessesAndPackaging: null | Record<string, string[]> = null;

  wasteRetailAndConsumer: null | Record<string, number[]> = null;

  constructor() {
    // JavaScript needs this so that we can pass references directly to the
    // methods of the class, while still retailinig the reference to `this`
    this.setFootprintsRpcs = this.setFootprintsRpcs.bind(this);
    this.setRpcOriginWaste = this.setRpcOriginWaste.bind(this);
    this.setProcessesEnergyDemands = this.setProcessesEnergyDemands.bind(this);
    this.setEmissionsFactorsEnergy = this.setEmissionsFactorsEnergy.bind(this);
    this.setEmissionsFactorsPackaging =
      this.setEmissionsFactorsPackaging.bind(this);
    this.setEmissionsFactorsTransport =
      this.setEmissionsFactorsTransport.bind(this);
    this.setPrepProcessesAndPackaging =
      this.setPrepProcessesAndPackaging.bind(this);
    this.setWasteRetailAndConsumer = this.setWasteRetailAndConsumer.bind(this);
    this.setFoodsRecipes = this.setFoodsRecipes.bind(this);
  }

  private recomputeEnvFootprints() {
    if (!this.footprintsRpcsPerOrigin) {
      console.info(
        "Method recomputeEnvFootprints called before env factors file was set."
      );
      return;
    }

    if (!this.rpcOriginWaste) {
      console.info(
        "Method recomputeEnvFootprints called before rpcFactors were set."
      );
      return;
    }

    this.footprintsRpcsMerged = flattenEnvironmentalFactors(
      this.footprintsRpcsPerOrigin,
      this.rpcOriginWaste
    );
  }

  public setFootprintsRpcs(footprintsRpcsPerOrigin: RpcFootprintsByOrigin) {
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
  ): number[] | null {
    if (!this.footprintsRpcsMerged) {
      throw new Error("getEnvImpact called before sheets were assigned.");
    }

    if (!this.footprintsRpcsMerged[rpcCode]) {
      console.warn(`Missing factors for ${rpcCode}.`);
      return null;
    }

    return this.footprintsRpcsMerged[rpcCode].map(
      (x) => (x * amountGram) / 1000
    );
  }

  // Set the rpc-factors, i.e. the origin of each rpc, its share, and its
  // production waste.
  public setRpcOriginWaste(rpcOriginWaste: RpcOriginWaste) {
    this.rpcOriginWaste = rpcOriginWaste;
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
    emissionsFactorsTransport: NestedRecord<string, number[]>
  ) {
    this.emissionsFactorsTransport = emissionsFactorsTransport;
  }

  public setPrepProcessesAndPackaging(
    processesAndPackaging: Record<string, string[]>
  ) {
    this.preparationProcessesAndPackaging = processesAndPackaging;
  }

  public computeImpacts(diet: Diet): ImpactsTuple {
    if (!this.footprintsRpcsPerOrigin) {
      throw new Error(
        "Compute called when no environmentalFactorsSheet was set."
      );
    }

    if (!this.foodsRecipes) {
      throw new Error("Compute called without foodsRecipes.");
    }

    if (!this.wasteRetailAndConsumer) {
      throw new Error(
        "Compute called without retail- and consumer waste factors set."
      );
    }

    if (!this.rpcOriginWaste) {
      throw new Error("Compute called when no rpcParameters were set.");
    }

    if (!this.countryCode || !this.processEnvFactors) {
      throw new Error("Compute called when no country or process was set.");
    }

    if (!this.emissionsFactorsPackaging) {
      throw new Error(
        "Compute called without emissions factors for packaging set."
      );
    }

    if (!this.emissionsFactorsTransport) {
      throw new Error(
        "Compute called without emissions factors for transport set."
      );
    }

    if (!this.preparationProcessesAndPackaging) {
      throw new Error("Compute called without processes and packaging set.");
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
          rpcCode,
          amount - (transportlessAmounts[rpcCode] || 0),
          this.rpcOriginWaste!,
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

  public computeImpactsDetailed(diet: Diet): [string, number, ImpactsTuple][] {
    return diet.map((entry) => [
      entry[0], // Code
      entry[1], // Amount
      this.computeImpacts([entry]),
    ]);
  }

  public computeImpactsOfRecipe(): [string, number, ImpactsTuple][] {
    if (!this.foodsRecipes) {
      throw new Error(
        "Called method computeImpactsOfRecipe before recipes were set."
      );
    }

    const codesInRecipes = new Set(Object.keys(this.foodsRecipes));
    Object.values(this.foodsRecipes).forEach((recipe: FoodsRecipeEntry) => {
      recipe.forEach((component) => {
        const code = component[0];
        codesInRecipes.add(code);
      });
    });

    const fauxDiet: Diet = [...codesInRecipes]
      .sort()
      .filter(code => getRpcCodeLevel(code) > 1)
      .map((code) => [code, 1000]);
    return this.computeImpactsDetailed(fauxDiet);
  }

  public computeImpactsByCategory(diet: Diet) {
    const impacts = this.computeImpacts(diet);
    if (!impacts) return null;

    const [rpcImpacts, processImpacts, packagingImpacts, transportImpacts] =
      impacts;

    const nonNullRpcImpacts: Record<string, number[]> = Object.fromEntries(
      Object.entries(rpcImpacts).filter(
        (kv): kv is [string, number[]] => kv[1] !== null
      )
    );
    const rpcImpactsByCategory = aggregateRpcCategories(nonNullRpcImpacts, 1);
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
