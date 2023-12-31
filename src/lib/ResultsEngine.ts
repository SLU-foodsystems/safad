import reduceDiet from "./rpc-reducer";
import {
  computeProcessImpacts,
  getProcessEnvFactors,
} from "./process-emissions";

import flattenRpcFootprints from "./footprints-rpc-flattener";
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
import originWasteFactorsRestOfWorldAggregator from "./origin-waste-factors-row-aggregator";

/**
 * Ties all parts of computing the results into a singleton.
 */
class ResultsEngine {
  footprintsRpcsPerOrigin?: RpcFootprintsByOrigin;
  footprintsRpcsMerged?: RpcFootprints;

  rpcOriginWasteFull?: RpcOriginWaste;
  rpcOriginWaste?: RpcOriginWaste = undefined;

  foodsRecipes?: FoodsRecipes;

  countryCode?: string;
  processEnvFactors?: Record<string, number[]>;

  emissionsFactorsPackaging?: Record<string, number[]>;
  emissionsFactorsEnergy?: Record<string, number[] | Record<string, number[]>>;
  emissionsFactorsTransport?: NestedRecord<string, number[]>;

  processesEnergyDemands?: Record<string, number[]>;
  preparationProcessesAndPackaging?: Record<string, string[]>;

  wasteRetailAndConsumer?: Record<string, number[]>;

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
    this.computeImpacts = this.computeImpacts.bind(this);
  }

  private recomputeOriginAndWasteFactorsWithRoW() {
    if (!this.rpcOriginWasteFull) {
      console.info(
        "Method recomputeOriginAndWasteFactorsWithRoW called before rpcOriginWasteFull was set."
      );
      return;
    }

    if (!this.footprintsRpcsPerOrigin) {
      console.info(
        "Method rpcOriginWasteFull called before rpcOriginWasteFull was set."
      );
      return;
    }

    this.rpcOriginWaste = originWasteFactorsRestOfWorldAggregator(
      this.rpcOriginWasteFull,
      mapValues(
        this.footprintsRpcsPerOrigin,
        (obj) => new Set(Object.keys(obj))
      )
    );
  }

  private recomputeFlattenedRpcFootprints() {
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

    this.footprintsRpcsMerged = flattenRpcFootprints(
      this.footprintsRpcsPerOrigin,
      this.rpcOriginWaste
    );
  }

  public setFootprintsRpcs(footprintsRpcsPerOrigin: RpcFootprintsByOrigin) {
    this.footprintsRpcsPerOrigin = footprintsRpcsPerOrigin;

    if (this.rpcOriginWasteFull) {
      this.recomputeOriginAndWasteFactorsWithRoW();
      this.recomputeFlattenedRpcFootprints();
    }
  }

  // Set the rpc-factors, i.e. the origin of each rpc, its share, and its
  // production waste.
  public setRpcOriginWaste(rpcOriginWasteFull: RpcOriginWaste) {
    this.rpcOriginWasteFull = rpcOriginWasteFull;

    if (this.footprintsRpcsPerOrigin) {
      this.recomputeOriginAndWasteFactorsWithRoW();
      this.recomputeFlattenedRpcFootprints();
    }
  }

  public setWasteRetailAndConsumer(
    wasteRetailAndConsumer: Record<string, number[]>
  ) {
    this.wasteRetailAndConsumer = wasteRetailAndConsumer;
  }

  public setFoodsRecipes(foodsRecipes: FoodsRecipes) {
    this.foodsRecipes = foodsRecipes;
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
      packagingAmounts,
      transportlessAmounts,
    ] = reduceDiet(
      dietWithWaste,
      this.foodsRecipes,
      this.preparationProcessesAndPackaging
    );

    const rpcImpacts = Object.fromEntries(
      rpcAmounts.map(([rpc, amountGram]) => [
        rpc,
        this.getRpcFootprints(rpc, amountGram),
      ])
    );

    // Per-process impacts
    const processesEnvImpacts = computeProcessImpacts(
      processesAmounts,
      this.processEnvFactors
    );

    const emissionsFactorsPackaging = this.emissionsFactorsPackaging;

    // Map the packetingAmounts to their respective emission factors
    const packagingEnvImpacts = mapValues(packagingAmounts, (amounts) =>
      Object.fromEntries(
        Object.entries(amounts).map(([packagingId, amount]) => [
          packagingId,
          emissionsFactorsPackaging[packagingId].map((x) => (x * amount) / 1e3),
        ])
      )
    );

    const { rpcOriginWaste, emissionsFactorsTransport, countryCode } = this;

    // Transport impacts
    const transportEnvImpactsEntries = rpcAmounts
      .map(([rpcCode, amount]) => [
        rpcCode,
        computeTransportEmissions(
          rpcCode,
          amount - (transportlessAmounts[rpcCode] || 0),
          rpcOriginWaste,
          emissionsFactorsTransport[countryCode],
          countryCode
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
      .filter((code) => getRpcCodeLevel(code) > 1)
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
