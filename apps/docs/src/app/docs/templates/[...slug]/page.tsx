import { getAllTemplates, getTemplateByName } from "@/lib/templates";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CliCommand } from "@/components/CliCommand";
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

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
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
    description:
      template.description ||
      `Learn about the ${template.title} template for ProofKit applications.`,
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
    <div className="container max-w-4xl mx-auto py-8">
      {/* Template header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="shrink-0 mt-1">
            {(() => {
              const CategoryIcon = getCategoryConfig(
                template.category as any,
              ).icon;
              return <CategoryIcon className="h-8 w-8 text-primary" />;
            })()}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{template.title}</h1>
            {template.description && (
              <p className="text-lg text-muted-foreground">
                {template.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
            {getCategoryConfig(template.category as any).name}
          </span>
          <span className="text-muted-foreground font-mono">
            {template.name}
          </span>
        </div>
      </div>

      {/* Installation command */}
      <div className="not-prose mb-8">
        <h2 className="text-lg font-semibold mb-4">Installation</h2>
        <CliCommand command={`add ${template.name}`} exec />
      </div>
    </div>
  );
}
