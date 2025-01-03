import * as core from "@actions/core";
import mv from "mv";
import * as fs from "fs";
import * as path from "path";
import util from "util";
const fsPromises = fs.promises;
const mvPromise = util.promisify(mv);
type CreateEnvFileSecretsParams = {
  customName: string;
  inputs: Record<string, string>;
  workingDirectory: string;
  prefixFilter: string;
  customDirectory: string;
};
const parseSercets = (inputs?: string) => {
  try {
    if (!inputs) return {};
    return JSON.parse(inputs) as Record<string, string>;
  } catch (err) {
    core.setFailed("Failed to parse secrets");
    return {};
  }
};
const findRootPackageJson = (
  startDirectory: string,
  currDirectory: string,
  prevDirectory?: string
): string => {
  //this means no package.json was found so we return the start directory
  if (currDirectory === prevDirectory) return startDirectory;
  const packagePath = path.join(currDirectory, "package.json");
  if (fs.existsSync(packagePath)) return currDirectory;
  const pathAbove = path.join(currDirectory, "..");
  return findRootPackageJson(startDirectory, pathAbove, packagePath);
};
const moveFile = async ({
  fileName,
  directoryStart,
  directoryDes,
  extension,
}: {
  fileName: string;
  directoryStart: string;
  directoryDes: string;
  extension?: string;
}) => {
  const fullFileName = extension ? `${fileName}.${extension}` : fileName;
  let curr_path = path.join(directoryStart, fullFileName);
  let destination_folder = directoryDes;
  let destination = path.join(destination_folder, fullFileName);
  //create folder if it doesnt exist
  if (!fs.existsSync(destination_folder)) {
    await fsPromises.mkdir(destination_folder);
  }
  //move file
  await mvPromise(curr_path, destination);
};
const createEnv = async ({
  customName,
  inputs,
  workingDirectory,
  prefixFilter,
}: Omit<CreateEnvFileSecretsParams, "customDirectory">) => {
  const fileName = customName;
  const secretsParse = inputs;
  const appSecrets = Object.entries(secretsParse).filter(([key, value]) => {
    //ensure this is never logged
    core.setSecret(value);
    const regex = new RegExp(prefixFilter);
    return regex.test(key);
  });
  const envValues: {
    [key: string]: string;
  } = {};
  for (let [key, value] of appSecrets) envValues[key] = value;
  const envContent = Object.keys(envValues).map(
    (key) => `${key} = "${envValues[key]}"\r\n`
  );
  const startDirectory = workingDirectory;
  const startFilePath = path.join(startDirectory, `${fileName}.env`);
  await fsPromises.writeFile(startFilePath, envContent);
  //notify what secrets were copied
  if (appSecrets.length <= 0) {
    core.setFailed("No app secrets found to extract");
    return {
      startDirectory,
      envValues,
      fileName: `${fileName}.env`,
    };
  }

  const secretNamesCopied = `${Object.keys(envValues).reduce(
    (a, b) => a + ", " + b
  )} copied`;
  core.info(secretNamesCopied);
  return {
    startDirectory,
    envValues,
    fileName: `${fileName}.env`,
  };
};
const moveEnv = async (
  payload: Pick<
    CreateEnvFileSecretsParams,
    "workingDirectory" | "customDirectory"
  > & {
    fileName: string;
    startDirectory: string;
    envValues: Record<string, string>;
  }
) => {
  const { fileName, envValues, startDirectory, customDirectory } = payload;
  const directoryDes = customDirectory;
  //move to root directory
  await moveFile({
    fileName,
    directoryStart: startDirectory,
    directoryDes: directoryDes,
  });
  //notify where new env file was moved to
  const output = `${fileName} moved to ${directoryDes}`;
  core.info(output);
  core.setOutput("secrets", envValues);
};
export const createEnvFile = async ({
  inputs,
  customName,
  customDirectory,
  workingDirectory,
  prefixFilter,
}: CreateEnvFileSecretsParams) => {
  try {
    const payload = await createEnv({
      inputs,
      customName,
      workingDirectory,
      prefixFilter,
    }); //create env file and return payload
    await moveEnv({ ...payload, customDirectory, workingDirectory }); //move env file
  } catch (err) {
    console.error(err);
    core.setFailed("Something went wrong. Check error in logs");
  }
};
export const main = async () => {
  const inputs = parseSercets(core.getInput("APP_SECRETS"));
  const prefixFilter = core.getInput("PREFIX_FILTER") || ".*";
  const customName = core.getInput("ENV_FILE_NAME") || "";
  const workingDirectory =
    core.getInput("WORKING_DIRECTORY_PATH") || process.cwd();
  const resolvedWorkingDirectory = path.resolve(workingDirectory);
  const customDirectory =
    core.getInput("DESTINATION_PATH") ||
    findRootPackageJson(resolvedWorkingDirectory, resolvedWorkingDirectory);
  const resolvedCustomDirectory = path.resolve(customDirectory);
  return createEnvFile({
    inputs,
    customName,
    customDirectory: resolvedCustomDirectory,
    workingDirectory: resolvedWorkingDirectory,
    prefixFilter,
  });
};
main();
