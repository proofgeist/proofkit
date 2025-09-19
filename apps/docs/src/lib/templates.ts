import { getRegistryIndex } from "@proofkit/registry";
import path from "path";

export interface TemplateWithPath {
  name: string;
  title: string;
  description?: string;
  category: "component" | "page" | "utility" | "hook" | "email";
  path: string;
}

/**
 * Get the path to templates based on environment
 */
function getTemplatesPath(): string {
  if (process.env.NODE_ENV === "production") {
    // In production, templates are bundled in the public directory
    return path.join(process.cwd(), "public/registry-templates");
  } else {
    // In development, read directly from registry package
    return path.resolve(process.cwd(), "../../packages/registry/templates");
  }
}

/**
 * Load all templates from the registry at build time
 */
export async function getAllTemplates(): Promise<TemplateWithPath[]> {
  try {
    const templatesPath = getTemplatesPath();
    const index = await getRegistryIndex(templatesPath);

    return index.map((template) => ({
      ...template,
      path: `/templates/${template.name}`,
    }));
  } catch (error) {
    console.error("Failed to load templates:", error);
    return [];
  }
}

/**
 * Get templates grouped by category
 */
export async function getTemplatesByCategory(): Promise<
  Record<string, TemplateWithPath[]>
> {
  const templates = await getAllTemplates();

  const grouped = templates.reduce(
    (acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, TemplateWithPath[]>,
  );

  // Sort templates within each category by title
  Object.keys(grouped).forEach((category) => {
    grouped[category].sort((a, b) => a.title.localeCompare(b.title));
  });

  return grouped;
}

/**
 * Get a single template by name
 */
export async function getTemplateByName(
  name: string,
): Promise<TemplateWithPath | null> {
  const templates = await getAllTemplates();
  return templates.find((template) => template.name === name) || null;
}

/**
 * Search templates by title or description
 */
export function searchTemplates(
  templates: TemplateWithPath[],
  query: string,
): TemplateWithPath[] {
  if (!query.trim()) {
    return templates;
  }

  const lowercaseQuery = query.toLowerCase();

  return templates.filter(
    (template) =>
      template.title.toLowerCase().includes(lowercaseQuery) ||
      template.description?.toLowerCase().includes(lowercaseQuery) ||
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.category.toLowerCase().includes(lowercaseQuery),
  );
}


