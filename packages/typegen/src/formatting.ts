import { Project } from "ts-morph";
import * as prettier from "prettier";

/**
 * Formats all source files in a ts-morph Project using prettier and saves the changes.
 * @param project The ts-morph Project containing the files to format
 */
export async function formatAndSaveSourceFiles(project: Project) {
  try {
    const files = project.getSourceFiles();

    // run each file through the prettier formatter
    for await (const file of files) {
      const filePath = file.getFilePath();
      const fileInfo = (await prettier.getFileInfo?.(filePath)) ?? {
        ignored: false,
      };

      if (fileInfo.ignored) continue;

      const formatted = await prettier.format(file.getFullText(), {
        filepath: filePath,
      });
      file.replaceWithText(formatted);
    }
  } catch (error) {}
  await project.save();
}
