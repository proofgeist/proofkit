import { Command } from "@commander-js/extra-typings";
import { readFile } from "fs-extra";

import { execa } from "execa";
import { executeMigration, migrationPlanSchema } from "../migrate";
import { prettifyError } from "zod/v4";

async function main() {
  const program = new Command();

  program
    .command("migrate", { isDefault: true })
    .option("-i, --input <path>", "Path to the input file")
    .action(async (options) => {
      if (options.input) {
        try {
          const inputData = JSON.parse(await readFile(options.input, "utf-8"));

          const parsed = migrationPlanSchema.safeParse(inputData);

          if (!parsed.success) {
            console.error(
              "Failed to parse input file:",
              prettifyError(parsed.error),
            );
            process.exit(1);
          }

          const migrationPlan = parsed.data;

          await executeMigration(db, migrationPlan);
        } catch (error) {
          console.error("Failed to parse input file:", error);
          process.exit(1);
        }
      } else {
        // run the better-auth cli to generate the migration plan
        await execa("npx", ["@better-auth/cli", "generate", "-y"]);
      }
    });
  await program.parseAsync(process.argv);
  process.exit(0);
}

main().catch(console.error);
