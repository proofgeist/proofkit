import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateTypedClients } from "@proofkit/typegen";
import { typegenConfigSingle } from "@proofkit/typegen/config";
import { OttoAPIKey } from "@proofkit/fmdapi";
import { z } from "zod/v4";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";

import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

async function testTypegenConfig(config: z.infer<typeof typegenConfigSingle>) {
  const genPath = config.path || path.resolve(__dirname, "./typegen-output"); // Use config path or default

  // 1. Generate the code
  await fs.mkdir(genPath, { recursive: true }); // Ensure genPath exists
  await expect(generateTypedClients(config)).resolves.not.toThrow();

  // assert that the folders are not empty
  const files = await fs.readdir(genPath);
  expect(files.length).toBeGreaterThan(0);

  const generatedPath = path.join(genPath, "generated");
  const generatedFiles = await fs.readdir(generatedPath);
  expect(generatedFiles.length).toBeGreaterThan(0);

  // Rely on tsconfig.json includes, specify path relative to monorepo root
  const tscCommand = "pnpm tsc --noEmit -p packages/typegen/tsconfig.json";
  execSync(tscCommand, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../../.."), // Execute from monorepo root
  });

  return { genPath };
}

describe("typegen", () => {
  // Define a base path for generated files if not specified in config
  const baseGenPath = path.resolve(__dirname, "./typegen-output");

  beforeAll(async () => {
    await fs.remove(baseGenPath);
  });

  it("basic typegen with zod", async () => {
    const config: z.infer<typeof typegenConfigSingle> = {
      layouts: [
        {
          layoutName: "layout",
          schemaName: "testLayout",
          valueLists: "allowEmpty",
        },
        { layoutName: "Weird Portals", schemaName: "weirdPortals" },
      ],
      path: path.join(baseGenPath, "with-zod"), // Unique path for this config
      envNames: {
        auth: { apiKey: "DIFFERENT_OTTO_API_KEY" as OttoAPIKey },
        server: "DIFFERENT_FM_SERVER",
        db: "DIFFERENT_FM_DATABASE",
      },
      clientSuffix: "Layout",
      clearOldFiles: true,
    };
    const { genPath } = await testTypegenConfig(config);

    // get client/testLayout.ts

    const clientPath = path.join(genPath, "client", "testLayout.ts");
    const clientContent = await fs.readFile(clientPath, "utf-8");
    await expect(clientContent).toMatchFileSnapshot(
      path.join(__dirname, "__snapshots__", "with-zod.snap.ts"),
    );
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
        { layoutName: "Weird Portals", schemaName: "weirdPortals" },
      ],
      path: path.join(baseGenPath, "without-zod"),
      envNames: {
        auth: { apiKey: "DIFFERENT_OTTO_API_KEY" as OttoAPIKey },
        server: "DIFFERENT_FM_SERVER",
        db: "DIFFERENT_FM_DATABASE",
      },
      validator: false,
    };
    await testTypegenConfig(config);

    const { genPath } = await testTypegenConfig(config);

    // get client/testLayout.ts

    const clientPath = path.join(genPath, "client", "testLayout.ts");
    const clientContent = await fs.readFile(clientPath, "utf-8");
    await expect(clientContent).toMatchFileSnapshot(
      path.join(__dirname, "__snapshots__", "without-zod.snap.ts"),
    );
  }, 30000);
});
