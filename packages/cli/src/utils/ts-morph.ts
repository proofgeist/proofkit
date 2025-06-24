import path from "path";
import { Project, SyntaxKind, type ReturnStatement } from "ts-morph";

export { formatAndSaveSourceFiles } from "@proofkit/shared-utils";

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
