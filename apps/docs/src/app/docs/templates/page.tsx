import type { Metadata } from "next";
import { getAllTemplates, getTemplatesByCategory } from "@/lib/templates";
import { TemplatesPageClient } from "./templates-client";

export const metadata: Metadata = {
  title: "Templates - ProofKit",
  description: "Discover and explore our collection of templates for building FileMaker-powered applications.",
};

export default async function TemplatesPage() {
  const [templates, templatesByCategory] = await Promise.all([getAllTemplates(), getTemplatesByCategory()]);

  return (
    <div className="">
      <div className="mb-8">
        <h1 className="mb-4 font-bold text-4xl">ProofKit Templates</h1>
        <p className="text-lg text-muted-foreground">
          Discover and explore our collection of templates for building FileMaker-powered applications.
        </p>
      </div>

      <TemplatesPageClient templates={templates} templatesByCategory={templatesByCategory} />
    </div>
  );
}
