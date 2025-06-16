import path from "path";
import { format, getFileInfo } from "prettier";
import { Project, SyntaxKind, type ReturnStatement } from "ts-morph";

export function ensureReturnStatementIsWrappedInFragment(
  returnStatement: ReturnStatement | undefined
) {
  const expression =
    returnStatement
      ?.getExpressionIfKind(SyntaxKind.ParenthesizedExpression)
      ?.getExpression() ?? returnStatement?.getExpression();

  if (expression?.isKind(SyntaxKind.JsxFragment)) {
    return returnStatement;
  }

  returnStatement?.replaceWithText(`return <>${expression}</>;`);
  return returnStatement;
}

export function getNewProject(projectDir?: string) {
  const project = new Project({
    tsConfigFilePath: path.join(projectDir ?? process.cwd(), "tsconfig.json"),
  });

  return project;
}

export async function formatAndSaveSourceFiles(project: Project) {
  const files = project.getSourceFiles();
  // run each file through the prettier formatter
  for await (const file of files) {
    const filePath = file.getFilePath();
    const fileInfo = await getFileInfo(filePath);

    if (fileInfo.ignored) continue;

    const formatted = await format(file.getFullText(), {
      filepath: filePath,
    });
    file.replaceWithText(formatted);
  }
  await project.save();
}
