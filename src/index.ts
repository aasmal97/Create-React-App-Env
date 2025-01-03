import * as core from "@actions/core";
import mv from "mv";
import * as fs from "fs";
import * as path from "path";
import util from "util";
const fsPromises = fs.promises;
const mvPromise = util.promisify(mv);
const findRootPackageJson = (startDirectory: string): string => {
  const packagePath = path.join(startDirectory, "package.json");
  if (fs.existsSync(packagePath)) return startDirectory;
  const pathAbove = path.join(startDirectory, "..");
  return findRootPackageJson(pathAbove);
};
const moveFile = async ({
  fileName = "",
  directoryStart = "",
  directoryDes = "",
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
  prefixFilter = ".*",
}: {
  customName?: string;
  inputs: string;
  workingDirectory?: string;
  prefixFilter?: string;
}) => {
  const fileName = customName ? customName : "";
  const secretsParse = JSON.parse(inputs) as { [key: string]: string };
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
  const startDirectory = workingDirectory ? workingDirectory : process.cwd();
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
const moveEnv = async (payload: {
  customDirectory?: string;
  fileName: string;
  startDirectory: string;
  workingDirectory?: string;
  envValues: {
    [key: string]: string;
  };
}) => {
  const { fileName, envValues, startDirectory } = payload;
  const currDirectory = payload.workingDirectory
    ? payload.workingDirectory
    : process.cwd();
  const directoryDes = payload.customDirectory
    ? payload.customDirectory
    : findRootPackageJson(currDirectory);
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
}: {
  inputs: string;
  customName?: string;
  customDirectory?: string;
  workingDirectory?: string;
  prefixFilter?: string;
}) => {
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
  const inputs = core.getInput("APP_SECRETS");
  const prefixFilter = core.getInput("PREFIX_FILTER");
  const customName = core.getInput("ENV_FILE_NAME");
  const customDirectory = core.getInput("DESTINATION_PATH");
  const workingDirectory = core.getInput("WORKING_DIRECTORY_PATH");
  return createEnvFile({
    inputs,
    customName,
    customDirectory,
    workingDirectory,
    prefixFilter,
  });
};
main();
