import {
  CsvValidationError,
  CsvValidationErrorType,
} from "./input-files-parsers";
import { downloadAsPlaintext } from "./io";

const MDATES = __INPUT_FILE_MDATES__;

interface SetFilePayload {
  data: string;
  name: string;
}

export const resetFile = async <T>(
  countryCode: string,
  fileInterface: InputFile<T> | null
) => {
  if (!fileInterface) return;

  fileInterface.setter(
    fileInterface.parser(await fileInterface.getDefault(countryCode))
  );
  const overrides: Partial<InputFile<T>> = {
    name: "",
    state: "default",
    data: undefined,
  };
  Object.assign(fileInterface, overrides);
};

export const setFile = async <T>(
  payload: SetFilePayload,
  fileInterface: InputFile<T> | null
) => {
  if (!fileInterface) return;

  // We try first to parse the file using a comma, but if that fails, we try to
  // recover with a semi-colon. This is because excel makes it notoriously
  // difficult for users to actually export csvs with commas
  try {
    fileInterface.setter(fileInterface.parser(payload.data, ","));
  } catch (err) {
    if (
      err &&
      err instanceof CsvValidationError &&
      err.type === CsvValidationErrorType.SemiColon
    ) {
      fileInterface.setter(fileInterface.parser(payload.data, ";"));
    } else {
      throw err;
    }
  }

  Object.assign(fileInterface, {
    name: payload.name,
    state: "custom",
    data: payload.data,
  });
};

export const downloadFile = async <T>(
  countryCode: string,
  fileInterface: InputFile<T> | null
) => {
  if (!fileInterface) return;

  if (fileInterface.state === "default") {
    downloadAsPlaintext(
      await fileInterface.getDefault(countryCode),
      fileInterface.defaultName(countryCode)
    );
  } else {
    downloadAsPlaintext(fileInterface.data || "", fileInterface.name);
  }
};

export const setComment = async <T>(
  comment: string,
  fileInterface: InputFile<T> | null
) => {
  if (!fileInterface) return;
  fileInterface.comment = comment;
};

export const initInputFile = <T>(
  partialInputFile: Pick<
    InputFile<T>,
    "defaultName" | "getDefault" | "parser" | "setter"
  >
): InputFile<T> => ({
  state: "default",
  name: "",
  comment: "",
  data: undefined,
  lastModified: (countryCode: string) =>
    MDATES[partialInputFile.defaultName(countryCode)] || "",
  ...partialInputFile,
});
