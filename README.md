# Create Env File

## Description

This Github Action generates a local .env file in a github runner, by extracting environment variables from your secrets or custom defined object, that match all secrets, or any prefix

## How this action works

1. First, the action parses the secrets object, and filters out any secrets that do not match the APP prefix.
2. After, the action creates a `.env` file (or a `prefix.env` if a `ENV_FILE_NAME` was specified) in the current working directory of the runner.
3. Then, the action moves the generated file to the custom destination path provided by the user, OR recursively searches up from the current working directory, to find the **NEAREST** `package.json` file, and moves the `.env` file to it's same directory.
4. Once the action confirms the move, the runner exits, and if no error is present, continues to the next step

## How to Use:

Below is an example of the minimum appropriate configuration

```yaml
name: Create Env File
uses: aasmal97/create-env-file@v3.1.0
with:
  APP_SECRETS: ${{toJson(secrets)}}
```

## Inputs

- `APP_SECRETS`: Takes in a stringified JSON object that holds all your secrets or variables **_(required)_**
- `ENV_FILE_NAME`: If you want to customized the .env name (i.e `local.env`, etc), add the desired name here. **_(optional)_**
- `WORKING_DIRECTORY_PATH`: The ABSOLUTE PATH, that you want the action to start at. If relative paths exist within this value, they are resolved. For example `home/add/../app` resolves to `home/app`. By default this is `cwd` where the action is run **_(optional)_**
- `DESTINATION_PATH`: The ABSOLUTE PATH, that you want the .env file to be generated in. If relative paths exist within this value they are resolved. For example `home/add/../app` resolves to `home/app`. By default, this is the directory where the nearest `package.json` is found, from the `WORKING_DIRECTORY_PATH` value, or if this file does not exist, the `cwd` itself. **_(optional)_**
- `PREFIX_FILTER`: A regex pattern that matches a secret's name, so it can be extracted. Commonly used to match for prefix patterns like `REACT_APP`. If not defined, it matches ALL secrets passed into the action **_(optional)_**

## Full Example of usage:

```yaml
name: Create Env
uses: aasmal97/create-env-file@v3.1.0
with:
  APP_SECRETS: ${{toJson(secrets)}}
  ENV_FILE_NAME: "local"
  DESTINATION_PATH: ${{ github.workspace }}/src
```

## Tips

- Due to multiple projects having different configs and project directory structures, it is best to provide a `DESTINATION_PATH` value, so the location of the file being generated does not change and is always known.
- If you wish to rely on the auto-detection of the nearest `package.json`, and not specify an absolute destination path, try to ensure consistency by setting a `WORKING_DIRECTORY_PATH` of the action as close as possible, to the package.json file. Below is an example of this:

```yaml
name: Create Env
uses: aasmal97/create-env-file@v3.1.0
with:
  WORKING_DIRECTORY_PATH: ${{ github.workspace }}/src
  APP_SECRETS: ${{toJson(secrets)}}
```
