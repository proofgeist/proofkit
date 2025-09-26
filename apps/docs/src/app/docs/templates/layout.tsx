import { DocsLayout } from "@/components/layout/docs";
import type { ReactNode } from "react";
import { baseOptions } from "../../layout.config";
import { getTemplatesByCategory } from "@/lib/templates";
import { type TemplateMetadata } from "@proofkit/registry";
import { PageTree } from "fumadocs-core/server";
import { source } from "@/lib/source";
import { New_Tegomin } from "next/font/google";
import { getSidebarTabs } from "fumadocs-ui/utils/get-sidebar-tabs";
import { categoryConfigs, categoryConfigMap } from "./category-config";

type Category = TemplateMetadata["category"];

async function buildTemplatesTree() {
  const templatesByCategory = await getTemplatesByCategory();

  const children: PageTree.Root["children"] = [
    {
      name: "Overview",
      url: "/docs/templates",
      type: "page",
    },
  ];

  // Add each category as a separator followed by its templates in the defined order
  categoryConfigs.forEach(({ category, name }) => {
    const templates = templatesByCategory[category];
    if (!templates || templates.length === 0) return;

    // Add category separator
    children.push({
      name,
      type: "separator",
    });

    // Add all templates in this category
    templates.forEach((template) => {
      children.push({
        name: template.title,
        url: `/docs${template.path}`,
        type: "page",
      });
    });
  });

  return {
    children,
  };
}

export default async function Layout({ children }: { children: ReactNode }) {
  const templatesTree = await buildTemplatesTree();

  // Find the existing Templates folder in the source tree
  const templatesFolder = source.pageTree.children.find(
    (child) => child.type === "folder" && child.name === "Templates",
  );

  // Create a new tree with the Templates folder replaced
  const newChildren = source.pageTree.children.map((child) => {
    if (child.type === "folder" && child.name === "Templates") {
      // Replace the Templates folder with our custom one that includes dynamic templates
      return {
        ...child, // Preserve the original properties (including icon, root, etc.)
        children: templatesTree.children,
      };
    }
    return child;
  });

  const newTree: PageTree.Root = {
    ...source.pageTree,
    children: newChildren,
  };

  const tabs = getSidebarTabs(newTree);

  return (
    <DocsLayout
      tree={newTree}
      {...baseOptions}
      sidebar={{
        tabs: tabs,
        footer: (
          <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
            <p>
              Made with ❤️ by{" "}
              <a
                href="https://proofgeist.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Proof+Geist
              </a>
            </p>
          </div>
        ),
      }}
    >
      <div className="p-8">{children}</div>
    </DocsLayout>
  );
}
