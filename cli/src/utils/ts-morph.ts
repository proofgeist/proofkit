import { SyntaxKind, type ReturnStatement } from "ts-morph";

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
