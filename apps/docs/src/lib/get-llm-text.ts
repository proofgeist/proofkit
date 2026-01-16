import fs from "node:fs/promises";
import nodePath from "node:path";
import type { InferPageType } from "fumadocs-core/source";
import type { source } from "./source";

const FRONTMATTER_REGEX = /^---[\s\S]*?---\n?([\s\S]*)$/;

export async function getLLMText(page: InferPageType<typeof source>): Promise<string> {
  // Read raw MDX content - page.path is like "fmdapi/index.mdx"
  let content = "";
  try {
    const mdxPath = nodePath.join(process.cwd(), "content/docs", page.file.path);
    const raw = await fs.readFile(mdxPath, "utf-8");
    // Remove frontmatter (--- ... ---)
    const match = raw.match(FRONTMATTER_REGEX);
    content = match?.[1]?.trim() ?? raw;
  } catch {
    // Fallback: try with page.path if file.path doesn't work
    try {
      const mdxPath = nodePath.join(process.cwd(), "content/docs", page.path);
      const raw = await fs.readFile(mdxPath, "utf-8");
      const match = raw.match(FRONTMATTER_REGEX);
      content = match?.[1]?.trim() ?? raw;
    } catch {
      // Could not read file
    }
  }

  return `# ${page.data.title}
URL: https://proofkit.dev${page.url}

${page.data.description ?? ""}

${content}`.trim();
}
