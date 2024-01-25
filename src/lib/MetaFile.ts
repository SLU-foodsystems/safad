import { padLeft } from "./utils";

const fileInterfaceToString = (f: InputFile<any>) => {
  let str = f.name || f.defaultName;

  if (f.state === "default") {
    str += " (default)";
  }
  if (f.comment) {
    str += "\nComment: " + f.comment;
  }

  return str;
};

const sep = (char: string, len = 30) => char.repeat(len);

type InputFileKeys =
  | "emissionsFactorsPackagingFile"
  | "emissionsFactorsEnergyFile"
  | "emissionsFactorsTransportFile"
  | "foodsRecipesFile"
  | "rpcOriginWasteFile"
  | "processesEnergyDemandsFile"
  | "preparationProcessesAndPackagingFile"
  | "wasteRetailAndConsumerFile"
  | "footprintsRpcsFile"
  | "dietFile"
  | "slvRecipesFile";

export default class MetaFile {
  private readonly version = __APP_VERSION__;

  private inputFileInterfaces?: Record<InputFileKeys, InputFile<any>>;

  public setInputFileInterfaces(dict: Record<InputFileKeys, InputFile<any>>) {
    this.inputFileInterfaces = dict;
  }

  private dateString() {
    const d = new Date();
    const YYYY = d.getFullYear();
    const M = d.getMonth() + 1;
    const D = d.getDate();

    const HH = d.getHours();
    const MM = d.getMinutes();

    // Tag function to pad all numbers with an additional zero where needed
    const pad = (
      strings: TemplateStringsArray,
      ...vars: (number | string)[]
    ) =>
      String.raw(strings, ...vars.map((x: number | string) => padLeft(x, 2)));

    return pad`${YYYY}-${M}-${D} ${HH}:${MM}`;
  }

  toString(): string {
    const f = this.inputFileInterfaces; // shortcut.
    if (!f) return "Error."; // TODO: Give better fallback

    return [
      "SAFAD Export Data",
      "",
      "Date: " + this.dateString(),
      `Version: ${this.version}`,
      "",
      "Files:",
      sep("="),
      "",
      "Emissions Factors Files:",
      sep("-"),
      "Emissions Factors - Packaging: " +
        fileInterfaceToString(f.emissionsFactorsPackagingFile),
      "Emissions Factors - Energy: " +
        fileInterfaceToString(f.emissionsFactorsEnergyFile),
      "Emissions Factors - Transport: " +
        fileInterfaceToString(f.emissionsFactorsTransportFile),
      "",
      "Input Parameter Files:",
      sep("-"),
      "Recipes:" + fileInterfaceToString(f.foodsRecipesFile),
      "Origin and Waste of RPC: " + fileInterfaceToString(f.rpcOriginWasteFile),
      "Energy demands of processes: " +
        fileInterfaceToString(f.processesEnergyDemandsFile),
      "Preparation Processes and Packaging: " +
        fileInterfaceToString(f.preparationProcessesAndPackagingFile),
      "Waste, Conumser and retail: " +
        fileInterfaceToString(f.wasteRetailAndConsumerFile),
      "",
      "Input Diet Files:",
      sep("-"),
      "Footprints of RPCs:" + fileInterfaceToString(f.footprintsRpcsFile),
      "Diet: " + fileInterfaceToString(f.dietFile),
      "SLV Recipes: " + fileInterfaceToString(f.slvRecipesFile),
    ].join("\n");
  }
}
