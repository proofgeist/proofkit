#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";
import { typegenConfigForValidation } from "../src/types.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const schema = z.toJSONSchema(typegenConfigForValidation, {
  reused: "ref",
  target: "draft-7",
});

const outputPath = join(__dirname, "../typegen.schema.json");

writeFileSync(outputPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(`✅ Generated JSON schema at ${outputPath}`);
