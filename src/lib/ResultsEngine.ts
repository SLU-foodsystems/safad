import reduceDiet from "@/lib/rpc-reducer";
import {
  computeProcessImpacts,
  getProcessEnvFactors,
} from "@/lib/process-emissions";

import flattenRpcFootprints from "@/lib/footprints-rpc-flattener";
import {
  aggregateBy,
  getRpcCodeLevel,
  mapValues,
  vectorSum,
} from "@/lib/utils";

import computeTransportEmissions from "@/lib/transport-emissions";
import adjustDietForWaste from "@/lib/waste-retail-consumer-adjuster";
import originWasteFactorsRestOfWorldAggregator from "@/lib/origin-waste-factors-row-aggregator";

/**
 * Ties all parts of computing the results into a singleton.
 */
class ResultsEngine {
  footprintsRpcsPerOrigin?: RpcFootprintsByOrigin;
  footprintsRpcsMerged?: RpcFootprints;

  rpcOriginWasteFull?: RpcOriginWaste;
  rpcOriginWaste?: RpcOriginWaste;

  foodsRecipes?: FoodsRecipes;

  countryCode?: string;
  processEnvFactors?: Record<string, number[]>;

  emissionsFactorsPackaging?: Record<string, number[]>;
  emissionsFactorsEnergy?: Record<string, number[] | Record<string, number[]>>;
  emissionsFactorsTransport?: NestedRecord<string, number[]>;

  processesEnergyDemands?: Record<string, number[]>;
  preparationProcesses?: Record<string, string[]>;
  packagingCodes?: Record<string, string>;

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
    this.setPreparationProcesses = this.setPreparationProcesses.bind(this);
    this.setPackagingCodes = this.setPackagingCodes.bind(this);
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

  public setPreparationProcesses(
    preparationProcesses: Record<string, string[]>
  ) {
    this.preparationProcesses = preparationProcesses;
  }

  public setPackagingCodes(packagingCodes: Record<string, string>) {
    this.packagingCodes = packagingCodes;
  }

  public reduceDiet(diet: Diet, withWaste = true) {
    if (!this.foodsRecipes) {
      throw new Error("RE::reduceDiet called without foodsRecipes.");
    }
    if (!this.preparationProcesses) {
      throw new Error("RE::reduceDiet called without preparationProcesses.");
    }
    if (!this.packagingCodes) {
      throw new Error("RE::reduceDiet called without packagingCodes.");
    }

    let dietWithWaste = diet;
    if (withWaste) {
      if (!this.wasteRetailAndConsumer) {
        throw new Error(
          "RE::reduceDiet called without wasteRetailAndConsumer."
        );
      }
      dietWithWaste = adjustDietForWaste(diet, this.wasteRetailAndConsumer);
    }
    return reduceDiet(
      dietWithWaste,
      this.foodsRecipes,
      this.preparationProcesses,
      this.packagingCodes
    );
  }

  private getRpcFootprints(
    rpcCode: string,
    amountGram: number
  ): number[] | null {
    if (!this.footprintsRpcsMerged) {
      throw new Error("getEnvImpact called before sheets were assigned.");
    }

    if (!this.footprintsRpcsMerged[rpcCode]) {
      console.warn(`Footprints RPC: Missing footprints for ${rpcCode}.`);
      return null;
    }

    if (Number.isNaN(amountGram)) {
      console.error(
        `getRpcFootprints recieved NaN amount for code ${rpcCode}.`
      );
      return null;
    }

    return this.footprintsRpcsMerged[rpcCode].map(
      (x) => (x * amountGram) / 1000
    );
  }

  public computeImpacts(diet: Diet, withWaste = true): ImpactsTuple {
    if (!this.footprintsRpcsPerOrigin) {
      throw new Error(
        "Compute called when no environmentalFactorsSheet was set."
      );
    }

    if (!this.wasteRetailAndConsumer) {
      throw new Error(
        "Compute called without retail- and consumer waste factors set."
      );
    }

    if (!this.rpcOriginWasteFull) {
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

    const [
      rpcAmounts,
      processesAmounts,
      packagingAmounts,
      transportlessAmounts,
    ] = this.reduceDiet(diet, withWaste);

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

    // Map the packagingAmounts to their respective emission factors
    const packagingEnvImpacts = mapValues(packagingAmounts, (amounts) =>
      Object.fromEntries(
        Object.entries(amounts).map(([packagingId, amount]) => [
          packagingId,
          emissionsFactorsPackaging[packagingId].map((x) => (x * amount) / 1e3),
        ])
      )
    );

    const { rpcOriginWasteFull, emissionsFactorsTransport, countryCode } = this;

    // Transport impacts
    const transportEnvImpactsEntries = rpcAmounts
      .map(([rpcCode, amount]) => [
        rpcCode,
        computeTransportEmissions(
          rpcCode,
          amount - (transportlessAmounts[rpcCode] || 0),
          rpcOriginWasteFull,
          emissionsFactorsTransport[countryCode]
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

  public getFoodCodes(): Set<string> {
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

    return codesInRecipes;
  }

  public computeImpactsOfRecipe(): [string, number, ImpactsTuple][] {
    const codesInRecipes = this.getFoodCodes();

    const fauxDiet: Diet = [...codesInRecipes]
      .sort()
      .filter((code) => getRpcCodeLevel(code) > 1)
      .map((code) => [code, 1000]);
    return this.computeImpactsDetailed(fauxDiet);
  }
}

export default ResultsEngine;
