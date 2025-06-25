import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { remarkInstall } from "fumadocs-docgen";
import { transformerTwoslash } from "fumadocs-twoslash";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import FileMakerLang from "./src/lib/FileMaker-tmLanguage.json";

// Options: https://fumadocs.vercel.app/docs/mdx/collections#define-docs
export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkInstall, { persist: { id: "package-manager" } }]],
    rehypeCodeOptions: {
      // You might want to configure themes here as well
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      langs: ["ts", "tsx", "js", "javascript", "json", FileMakerLang as any],
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        (() => {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const tryPaths = [
            path.resolve(
              process.cwd(),
              "apps/docs/content/docs/fmdapi/CustomersLayout.ts",
            ),
            path.resolve(
              process.cwd(),
              "content/docs/fmdapi/CustomersLayout.ts",
            ),
            path.resolve(__dirname, "content/docs/fmdapi/CustomersLayout.ts"),
          ];

          let customersLayoutSource = "";
          let selectedPath = "";
          for (const candidate of tryPaths) {
            if (fs.existsSync(candidate)) {
              selectedPath = candidate;
              try {
                customersLayoutSource = fs.readFileSync(candidate, "utf8");
              } catch {}
              break;
            }
          }

          // Only inject when we successfully read the file; otherwise let it error visibly
          const extraFiles: Record<string, string> | undefined =
            customersLayoutSource
              ? {
                  "CustomersLayout.ts": customersLayoutSource,
                  "./CustomersLayout.ts": customersLayoutSource,
                  "./CustomersLayout": customersLayoutSource,
                }
              : undefined;

          return transformerTwoslash({
            twoslashOptions: {
              fsCache: true,
              extraFiles,
            },
          });
        })(),
      ],
    },
  },
});
