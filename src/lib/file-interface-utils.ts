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

  fileInterface.setter(fileInterface.parser(payload.data));
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
    MDATES[partialInputFile.defaultName(countryCode)],
  ...partialInputFile,
});
