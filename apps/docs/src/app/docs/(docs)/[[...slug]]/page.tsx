import type { TableOfContents } from "fumadocs-core/toc";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { MDXProps } from "mdx/types";
import { notFound } from "next/navigation";
import type { FC } from "react";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

interface DocsPageData {
  title: string;
  description?: string;
  body: FC<MDXProps>;
  toc: TableOfContents;
  full?: boolean;
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  const data = page.data as DocsPageData;
  const MDXContent = data.body;

  return (
    <DocsPage
      editOnGithub={{
        owner: "proofgeist",
        repo: "proofkit",
        path: `apps/docs/content/docs/${page.path}`,
        sha: "main",
      }}
      full={data.full}
      toc={data.toc}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            // biome-ignore lint/suspicious/noExplicitAny: fumadocs type compatibility issue
            a: createRelativeLink(source as any, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
