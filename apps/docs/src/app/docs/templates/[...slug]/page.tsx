import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CliCommand } from "@/components/CliCommand";
import { getAllTemplates, getTemplateByName } from "@/lib/templates";
import { getCategoryConfig } from "../category-config";

interface TemplatePageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const templates = await getAllTemplates();

  return templates.map((template) => ({
    slug: template.name.split("/"),
  }));
}

export async function generateMetadata({ params }: TemplatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const templateName = slug.join("/");

  const template = await getTemplateByName(templateName);

  if (!template) {
    return {
      title: "Template Not Found",
    };
  }

  return {
    title: `${template.title} - ProofKit Templates`,
    description: template.description || `Learn about the ${template.title} template for ProofKit applications.`,
  };
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { slug } = await params;
  const templateName = slug.join("/");

  const template = await getTemplateByName(templateName);

  if (!template) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {/* Template header */}
      <div className="mb-8">
        <div className="mb-4 flex items-start gap-4">
          <div className="mt-1 shrink-0">
            {(() => {
              const CategoryIcon = getCategoryConfig(template.category).icon;
              return <CategoryIcon className="h-8 w-8 text-primary" />;
            })()}
          </div>
          <div className="flex-1">
            <h1 className="mb-2 font-bold text-4xl">{template.title}</h1>
            {template.description && <p className="text-lg text-muted-foreground">{template.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
            {getCategoryConfig(template.category).name}
          </span>
          <span className="font-mono text-muted-foreground">{template.name}</span>
        </div>
      </div>

      {/* Installation command */}
      <div className="not-prose mb-8">
        <h2 className="mb-4 font-semibold text-lg">Installation</h2>
        <CliCommand command={`add ${template.name}`} exec />
      </div>
    </div>
  );
}
