export const dynamic = "force-static";

export async function GET() {
  return Response.json({
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "generic-email",
    type: "registry:component",
    title: "Generic Email",
    description:
      "A generic React Email template with optional title, description, CTA, and footer.",
    files: [
      {
        path: "/r/email/generic",
        type: "registry:component",
        target: "src/emails/generic.tsx",
      },
    ],
  });
}

import path from "path";
import fs from "fs-extra";

export const dynamic = "force-static";

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "..",
    "..",
    "..",
    "packages",
    "cli",
    "template",
    "extras",
    "emailTemplates",
    "generic.tsx",
  );

  const content = fs.readFileSync(filePath, "utf8");

  return Response.json({
    name: "generic-email",
    type: "registry:component",
    files: [
      {
        name: "src/emails/generic.tsx",
        content,
        type: "registry:component",
      },
    ],
  });
}
