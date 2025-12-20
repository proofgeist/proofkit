import { describe, expect, it, beforeEach } from "vitest";
import { generateTypedClients } from "../src/typegen";
import { typegenConfigSingle } from "../src/types";
import { OttoAPIKey } from "../../fmdapi/src";
import { z } from "zod/v4";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

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

async function generateTypes(
  config: z.infer<typeof typegenConfigSingle>,
): Promise<string> {
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

  return genPath;
}

async function cleanupGeneratedFiles(genPath: string): Promise<void> {
  await fs.rm(genPath, { recursive: true, force: true });
  console.log(`Cleaned up ${genPath}`);
}

async function testTypegenConfig(
  config: z.infer<typeof typegenConfigSingle>,
): Promise<void> {
  const genPath = await generateTypes(config);
  await cleanupGeneratedFiles(genPath);
}

// Helper function to get the base path for generated files
function getBaseGenPath(): string {
  return path.resolve(__dirname, "./typegen-output");
}

// Export the functions for individual use
//
// Usage examples:
//
// 1. Generate types only:
//    const config = { layouts: [...], path: "typegen-output/my-config" };
//    const genPath = await generateTypes(config);
//    console.log(`Generated types in: ${genPath}`);
//
// 2. Clean up generated files:
//    await cleanupGeneratedFiles(genPath);
//
// 3. Get the base path for generated files:
//    const basePath = getBaseGenPath();
//    console.log(`Base path: ${basePath}`);
//
export { generateTypes, cleanupGeneratedFiles, getBaseGenPath };

describe("typegen", () => {
  // Define a base path for generated files relative to the test file directory
  const baseGenPath = getBaseGenPath();

  // Clean up the base directory before each test
  beforeEach(async () => {
    await fs.rm(baseGenPath, { recursive: true, force: true });
    console.log(`Cleaned base output directory: ${baseGenPath}`);
  });

  it("basic typegen with zod", async () => {
    const config: Extract<
      z.infer<typeof typegenConfigSingle>,
      { type: "fmdapi" }
    > = {
      type: "fmdapi",
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
    const config: Extract<
      z.infer<typeof typegenConfigSingle>,
      { type: "fmdapi" }
    > = {
      type: "fmdapi",
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
    const config: Extract<
      z.infer<typeof typegenConfigSingle>,
      { type: "fmdapi" }
    > = {
      type: "fmdapi",
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

    // Step 1: Generate types
    const genPath = await generateTypes(config);

    // Step 2: Use vitest file snapshots to check generated types files
    // This will create/update snapshots of the generated types files
    const typesPath = path.join(genPath, "generated", "testLayout.ts");
    const typesContent = await fs.readFile(typesPath, "utf-8");
    await expect(typesContent).toMatchFileSnapshot(
      path.join(__dirname, "__snapshots__", "strict-numbers.snap.ts"),
    );

    // Step 3: Clean up generated files
    await cleanupGeneratedFiles(genPath);
  }, 30000);

  it("zod validator", async () => {
    const config: Extract<
      z.infer<typeof typegenConfigSingle>,
      { type: "fmdapi" }
    > = {
      type: "fmdapi",
      layouts: [
        {
          layoutName: "layout",
          schemaName: "testLayout",
          valueLists: "allowEmpty",
          strictNumbers: true,
        },
        {
          layoutName: "customer_fieldsMissing",
          schemaName: "customer",
        },
      ],
      path: "typegen-output/config4", // Use relative path
      envNames: {
        auth: { apiKey: "DIFFERENT_OTTO_API_KEY" as OttoAPIKey },
        server: "DIFFERENT_FM_SERVER",
        db: "DIFFERENT_FM_DATABASE",
      },
      clientSuffix: "Layout",
      validator: "zod",
    };

    // Step 1: Generate types
    const genPath = await generateTypes(config);

    const snapshotMap = [
      {
        generated: path.join(genPath, "generated", "testLayout.ts"),
        snapshot: "zod-layout-client.snap.ts",
      },
      {
        generated: path.join(genPath, "testLayout.ts"),
        snapshot: "zod-layout-overrides.snap.ts",
      },
      {
        generated: path.join(genPath, "customer.ts"),
        snapshot: "zod-layout-client-customer.snap.ts",
      },
    ];

    for (const { generated, snapshot } of snapshotMap) {
      const generatedContent = await fs.readFile(generated, "utf-8");
      await expect(generatedContent).toMatchFileSnapshot(
        path.join(__dirname, "__snapshots__", snapshot),
      );
    }

    // Step 3: Clean up generated files
    await cleanupGeneratedFiles(genPath);
  }, 30000);

  it("should use OttoAdapter when apiKey is provided in envNames", async () => {
    const config: Extract<
      z.infer<typeof typegenConfigSingle>,
      { type: "fmdapi" }
    > = {
      type: "fmdapi",
      layouts: [
        {
          layoutName: "layout",
          schemaName: "testLayout",
          generateClient: true,
        },
      ],
      path: "typegen-output/auth-otto",
      envNames: {
        auth: { apiKey: "TEST_OTTO_API_KEY" as OttoAPIKey },
        server: "TEST_FM_SERVER",
        db: "TEST_FM_DATABASE",
      },
      generateClient: true,
    };

    const genPath = await generateTypes(config);

    // Check that the generated client uses OttoAdapter
    const clientPath = path.join(genPath, "client", "testLayout.ts");
    const clientContent = await fs.readFile(clientPath, "utf-8");

    expect(clientContent).toContain("OttoAdapter");
    expect(clientContent).not.toContain("FetchAdapter");
    expect(clientContent).toContain("TEST_OTTO_API_KEY");

    await cleanupGeneratedFiles(genPath);
  }, 30000);

  it("should use FetchAdapter when username/password is provided in envNames", async () => {
    const config: Extract<
      z.infer<typeof typegenConfigSingle>,
      { type: "fmdapi" }
    > = {
      type: "fmdapi",
      layouts: [
        {
          layoutName: "layout",
          schemaName: "testLayout",
          generateClient: true,
        },
      ],
      path: "typegen-output/auth-fetch",
      envNames: {
        auth: { username: "TEST_USERNAME", password: "TEST_PASSWORD" },
        server: "TEST_FM_SERVER",
        db: "TEST_FM_DATABASE",
      },
      generateClient: true,
    };

    const genPath = await generateTypes(config);

    // Check that the generated client uses FetchAdapter
    const clientPath = path.join(genPath, "client", "testLayout.ts");
    const clientContent = await fs.readFile(clientPath, "utf-8");

    expect(clientContent).toContain("FetchAdapter");
    expect(clientContent).not.toContain("OttoAdapter");
    expect(clientContent).toContain("TEST_USERNAME");
    expect(clientContent).toContain("TEST_PASSWORD");

    await cleanupGeneratedFiles(genPath);
  }, 30000);
});
