import {
  describe,
  expect,
  it,
  afterAll,
  beforeAll,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { generateTypedClients } from "../src/typegen";
import { typegenConfigSingle } from "../src/types";
import { OttoAPIKey } from "../../fmdapi/src";
import { z } from "zod/v4";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

import dotenv from "dotenv";
// // Load the correct .env.local relative to this test file's directory
// dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// Remove the old genPath definition - we'll use baseGenPath consistently

// Helper function to recursively get all .ts files (excluding index.ts)
async function getAllTsFilesRecursive(dir: string): Promise<string[]> {
  let files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getAllTsFilesRecursive(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.includes("index.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

async function testTypegenConfig(
  config: z.infer<typeof typegenConfigSingle>,
): Promise<void> {
  const genPath = path.resolve(__dirname, config.path || "./typegen-output"); // Resolve relative path to absolute

  // 1. Generate the code
  await fs.mkdir(genPath, { recursive: true }); // Ensure genPath exists
  await generateTypedClients(config, { cwd: __dirname }); // Pass the test directory as cwd
  console.log(`Generated code in ${genPath}`);

  // // 2. Modify imports in generated files to point to local src
  // const tsFiles = await getAllTsFilesRecursive(genPath);
  // const targetImportString = '"@proofkit/fmdapi"'; // Target the full string including quotes
  // const replacementImportString = '"../../../src"'; // Replacement string including quotes

  // console.log(
  //   `Checking ${tsFiles.length} generated files for import modification...`,
  // );
  // for (const filePath of tsFiles) {
  //   const fileName = path.basename(filePath);
  //   console.log(` -> Modifying import in ${fileName} (${filePath})`);
  //   const content = await fs.readFile(filePath, "utf-8");
  //   const newContent = content.replaceAll(
  //     targetImportString,
  //     replacementImportString,
  //   );

  //   if (content !== newContent) {
  //     await fs.writeFile(filePath, newContent, "utf-8");
  //   }
  // }

  // 3. Run tsc for type checking directly on modified files
  const relativeGenPath = path.relative(
    path.resolve(__dirname, "../../.."), // Relative from monorepo root
    genPath,
  );
  // Ensure forward slashes for the glob pattern, even on Windows
  // const globPattern = relativeGenPath.replace(/\\/g, "/") + "/**/*.ts";
  // Quote the glob pattern to handle potential spaces/special chars
  // const tscCommand = `pnpm tsc --noEmit --target ESNext --module ESNext --moduleResolution bundler --strict --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --lib ESNext,DOM --types node '${globPattern}'`;

  // Rely on tsconfig.json includes, specify path relative to monorepo root
  const tscCommand = "pnpm tsc --noEmit -p packages/typegen/tsconfig.json";
  console.log(`Running type check: ${tscCommand}`);
  execSync(tscCommand, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../../.."), // Execute from monorepo root
  });

  // Optional: Clean up generated files after test
  await fs.rm(genPath, { recursive: true, force: true });
  console.log(`Cleaned up ${genPath}`);
}

// Remove testConfig1 since it's not being used in the tests

describe("typegen", () => {
  // Define a base path for generated files relative to the test file directory
  const baseGenPath = path.resolve(__dirname, "./typegen-output");

  // Clean up the base directory before each test
  beforeEach(async () => {
    await fs.rm(baseGenPath, { recursive: true, force: true });
    console.log(`Cleaned base output directory: ${baseGenPath}`);
  });

  it("basic typegen with zod", async () => {
    const config: z.infer<typeof typegenConfigSingle> = {
      layouts: [
        {
          layoutName: "layout",
          schemaName: "testLayout",
          valueLists: "allowEmpty",
        },
        // { layoutName: "Weird Portals", schemaName: "weirdPortals" },
      ],
      path: "typegen-output/config1", // Use relative path
      envNames: {
        auth: { apiKey: "DIFFERENT_OTTO_API_KEY" as OttoAPIKey },
        server: "DIFFERENT_FM_SERVER",
        db: "DIFFERENT_FM_DATABASE",
      },
      clientSuffix: "Layout",
    };
    await testTypegenConfig(config);
  }, 30000);

  it("basic typegen without zod", async () => {
    // Define baseGenPath within the scope or ensure it's accessible
    // Assuming baseGenPath is accessible from the describe block's scope
    const config: z.infer<typeof typegenConfigSingle> = {
      layouts: [
        // add your layouts and name schemas here
        {
          layoutName: "layout",
          schemaName: "testLayout",
          valueLists: "allowEmpty",
        },
        // { layoutName: "Weird Portals", schemaName: "weirdPortals" },

        // repeat as needed for each schema...
        // { layout: "my_other_layout", schemaName: "MyOtherSchema" },
      ],
      path: "typegen-output/config2", // Use relative path
      // webviewerScriptName: "webviewer",
      envNames: {
        auth: { apiKey: "DIFFERENT_OTTO_API_KEY" as OttoAPIKey },
        server: "DIFFERENT_FM_SERVER",
        db: "DIFFERENT_FM_DATABASE",
      },
      validator: false,
    };
    await testTypegenConfig(config);
  }, 30000);

  it("basic typegen with strict numbers", async () => {
    const config: z.infer<typeof typegenConfigSingle> = {
      layouts: [
        {
          layoutName: "layout",
          schemaName: "testLayout",
          valueLists: "allowEmpty",
          strictNumbers: true,
        },
      ],
      path: "typegen-output/config3", // Use relative path
      envNames: {
        auth: { apiKey: "DIFFERENT_OTTO_API_KEY" as OttoAPIKey },
        server: "DIFFERENT_FM_SERVER",
        db: "DIFFERENT_FM_DATABASE",
      },
      clientSuffix: "Layout",
    };
    await testTypegenConfig(config);
  }, 30000);
});
