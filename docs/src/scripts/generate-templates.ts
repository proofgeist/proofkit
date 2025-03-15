import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  Project,
  SyntaxKind,
  ObjectLiteralExpression,
  type Node,
} from "ts-morph";

// Get the absolute path to the script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the template interface to match the structure in templates.ts
interface Template {
  requireData: boolean;
  label: string;
  hint?: string;
  templatePath: string;
  screenshot?: string;
  tags?: string[];
  postInstallFn?: any;
}

// Get the workspace root directory (3 levels up from the script)
const workspaceRoot = path.resolve(__dirname, "../../../");

function extractObjectLiteralValue(node: ObjectLiteralExpression): any {
  const obj: any = {};

  for (const property of node.getProperties()) {
    if (property.getKind() !== SyntaxKind.PropertyAssignment) continue;

    const name = property.getName();
    const value = property.getInitializer();

    if (!value) continue;

    // Handle different value types
    if (value.getKind() === SyntaxKind.StringLiteral) {
      obj[name] = value.getLiteralValue();
    } else if (value.getKind() === SyntaxKind.TrueKeyword) {
      obj[name] = true;
    } else if (value.getKind() === SyntaxKind.FalseKeyword) {
      obj[name] = false;
    } else if (value.getKind() === SyntaxKind.ArrayLiteralExpression) {
      obj[name] = value
        .getElements()
        .map((e: Node) => {
          if (e.getKind() === SyntaxKind.StringLiteral) {
            return e.getLiteralValue();
          }
          return undefined;
        })
        .filter(Boolean);
    } else if (value.getKind() === SyntaxKind.ObjectLiteralExpression) {
      obj[name] = extractObjectLiteralValue(value as ObjectLiteralExpression);
    }
  }

  return obj;
}

async function generateTemplatesJson() {
  // Initialize ts-morph project
  const project = new Project({
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
    },
  });

  // Add the templates file to the project
  const templatesPath = path.join(workspaceRoot, "config", "templates.ts");
  const sourceFile = project.addSourceFileAtPath(templatesPath);

  // Find the template variable declarations
  const templates: Record<string, Record<string, Template>> = {};

  ["nextjsTemplates", "wvTemplates"].forEach((templateName) => {
    const declaration = sourceFile.getVariableDeclaration(templateName);
    if (!declaration) return;

    const initializer = declaration.getInitializer();
    if (
      !initializer ||
      !ObjectLiteralExpression.isObjectLiteralExpression(initializer)
    )
      return;

    const framework = templateName.replace("Templates", "");
    templates[framework] = extractObjectLiteralValue(initializer);
  });

  // Create a simplified version of templates for documentation
  const simplifiedTemplates = Object.entries(templates).reduce(
    (acc: Record<string, any[]>, [framework, templateGroup]) => {
      acc[framework] = Object.entries(templateGroup).map(([key, template]) => ({
        id: key,
        requireData: template.requireData,
        label: template.label,
        hint: template.hint,
        templatePath: template.templatePath,
        screenshot: template.screenshot,
        tags: template.tags,
      }));
      return acc;
    },
    {},
  );

  const outputPath = path.resolve(
    __dirname,
    "../content/config/templates.json",
  );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(simplifiedTemplates, null, 2),
    "utf-8",
  );

  console.log("Templates JSON generated successfully at:", outputPath);
}

generateTemplatesJson().catch(console.error);
