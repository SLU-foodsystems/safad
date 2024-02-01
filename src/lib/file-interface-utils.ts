import { downloadAsPlaintext } from "./csv-io";

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
  Object.assign(fileInterface, {
    name: undefined,
    state: "default",
    data: undefined,
  });
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
      fileInterface.defaultName
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
    "defaultName" | "getDefault" | "parser" | "setter" | "lastModified"
  >
): InputFile<T> => ({
  state: "default",
  name: "",
  comment: "",
  data: undefined,
  ...partialInputFile,
});
