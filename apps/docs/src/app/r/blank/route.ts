import { NextResponse } from "next/server";
import { registryItemSchema, registryItemFileSchema } from "shadcn/registry";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";

type RegistryItem = z.infer<typeof registryItemSchema>;

export async function GET() {
  const filePath = path.join(process.cwd(), "../../apps/docs/public/test.tsx");
  const content = await fs.readFile(filePath, "utf-8");
  const item: RegistryItem = {
    name: "Test",
    type: "registry:file",
    files: [
      {
        content,
        type: "registry:file",
        target: "~/config.tsx",
        path: "config.tsx",
      },
    ],
  };
  return NextResponse.json(item);
}
