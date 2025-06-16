import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { remarkInstall } from "fumadocs-docgen";
import { transformerTwoslash } from "fumadocs-twoslash";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";

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
      langs: [FileMakerLang as any],
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash(),
      ],
    },
  },
});
