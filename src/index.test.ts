import { createEnvFile } from ".";
import * as fs from "fs";
import * as path from "path";
describe("createEnvFile function case 1", () => {
  test("should create and move env file with APP_SECRETS inputs", async () => {
    const inputs = JSON.stringify({
      REACT_APP_SECRET_KEY: "secret",
      OTHER_SECRET_KEY: "other-secret",
    });
    const customName = "";
    // const customDirectory = "/test/directory";
    await createEnvFile({
      inputs,
      prefixFilter: "REACT_APP.*",
      //customName,
      //   customDirectory,
    });
    // Check that env file was created and moved
    const envFileExists = fs.existsSync(
      path.join(process.cwd(), `${customName}.env`)
    );
    console.log(envFileExists);
    if (!envFileExists) {
      throw new Error("env file was not created");
    }
  });
});

describe("createEnvFile function case 2", () => {
  test("should create and move env file with APP_SECRETS inputs", async () => {
    const inputs = JSON.stringify({
      REACT_APP_SECRET_KEY: "secret",
      OTHER_SECRET_KEY: "other-secret",
    });
    const customName = "cool";
    const customDirectory = __dirname;
    await createEnvFile({
      inputs,
      customName,
      customDirectory,
    });
    // Check that env file was created and moved
    const envFileExists = fs.existsSync(
      path.join(customDirectory, `${customName}.env`)
    );
    console.log(envFileExists);
    if (!envFileExists) {
      throw new Error("env file was not created");
    }
  });
});
