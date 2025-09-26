import { getAllTemplates, getTemplatesByCategory } from "@/lib/templates";
import { TemplatesPageClient } from "./templates-client";
import type { Metadata } from "next";
import { DocsPage } from "fumadocs-ui/page";

export const metadata: Metadata = {
  title: "Templates - ProofKit",
  description:
    "Discover and explore our collection of templates for building FileMaker-powered applications.",
};

export default async function TemplatesPage() {
  const [templates, templatesByCategory] = await Promise.all([
    getAllTemplates(),
    getTemplatesByCategory(),
  ]);

  return (
    <div className="">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">ProofKit Templates</h1>
        <p className="text-lg text-muted-foreground">
          Discover and explore our collection of templates for building
          FileMaker-powered applications.
        </p>
      </div>

      <TemplatesPageClient
        templates={templates}
        templatesByCategory={templatesByCategory}
      />
    </div>
  );
}
