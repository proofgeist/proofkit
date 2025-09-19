import { getAllTemplates, getTemplateByName } from "@/lib/templates";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

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
            <Package className="h-8 w-8 text-primary" />
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
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground capitalize font-medium">
            {template.category}
          </span>
          <span className="text-muted-foreground font-mono">
            {template.name}
          </span>
        </div>
      </div>

      {/* Template content */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <div className="not-prose bg-muted/50 border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Template Details
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Installation
              </h3>
              <div className="bg-background border border-border rounded-md p-3 font-mono text-sm">
                <code>npx proofkit@latest add {template.name}</code>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Registry Path
              </h3>
              <p className="text-sm font-mono bg-background border border-border rounded-md p-3">
                {template.name}
              </p>
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Category
              </h3>
              <p className="text-sm capitalize">{template.category}</p>
            </div>
          </div>
        </div>

        {/* Placeholder content - you can expand this later */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About this template</h2>
          <p className="text-muted-foreground mb-4">
            This template provides{" "}
            {template.description?.toLowerCase() ||
              "functionality for your ProofKit application"}
            .
          </p>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Coming soon:</strong> Detailed documentation, code
              examples, and usage guides will be available here.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Documentation
            </Link>
            <Link
              href={`/r/${template.name}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              View Registry API
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
