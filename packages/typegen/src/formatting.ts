import chalk from "chalk";
import { execa, parseCommandString } from "execa";
import { format } from "prettier";
import type { Project } from "ts-morph";

/**
 * Formats all source files in a ts-morph Project using prettier and saves the changes.
 * @param project The ts-morph Project containing the files to format
 * @param postGenerateCommand Optional command to run after formatting
 * @param cwd Current working directory for command execution
 */
export async function formatAndSaveSourceFiles(
  project: Project,
  postGenerateCommand?: string,
  cwd: string = process.cwd(),
) {
  try {
    const files = project.getSourceFiles();

    // run each file through the prettier formatter
    for await (const file of files) {
      const filePath = file.getFilePath();

      const formatted = await format(file.getFullText(), {
        filepath: filePath,
      });
      file.replaceWithText(formatted);
    }
  } catch (_error) {
    // Ignore formatting errors and continue
  }
  await project.save();

  if (postGenerateCommand) {
    try {
      // Parse the command string into command and arguments
      const [command, ...args] = parseCommandString(postGenerateCommand);
      if (!command) {
        throw new Error("Post-generate command is empty");
      }
      console.log(chalk.blue(`Running post-generate command: ${command} ${args.join(" ")}`));
      await execa(command, args, { cwd });
      console.log(chalk.green("Post-generate command completed successfully"));
    } catch (error) {
      console.log(
        chalk.yellow(
          `Warning: Post-generate command failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
