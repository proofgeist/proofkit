import { migrate } from "@proofkit/better-auth/migrate";
import { fmDatabase } from "../src/auth";

async function main() {
  // Reference the JSON file in the root of the repo
  const schemaPath = new URL("../better-auth-schema.json", import.meta.url)
    .pathname;
  // @ts-ignore
  const schemaText = await Bun.file(schemaPath).text();
  const schema = JSON.parse(schemaText);

  await migrate(fmDatabase, schema.tables);
}

main();
