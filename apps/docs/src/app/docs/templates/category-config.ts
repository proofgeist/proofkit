import { Package, File, Wrench, Mail, Anchor } from "lucide-react";
import type { ComponentType } from "react";
import type { TemplateMetadata } from "@proofkit/registry";

type Category = TemplateMetadata["category"];

export interface CategoryConfig {
  category: Category;
  name: string;
  icon: ComponentType<any>;
}

export const categoryConfigs: CategoryConfig[] = [
  {
    category: "component",
    name: "Components",
    icon: Package,
  },
  {
    category: "page",
    name: "Pages",
    icon: File,
  },
  {
    category: "hook",
    name: "Hooks",
    icon: Anchor,
  },
  {
    category: "email",
    name: "Emails",
    icon: Mail,
  },
  {
    category: "utility",
    name: "Utilities",
    icon: Wrench,
  },
];

// Create a lookup map for O(1) access
export const categoryConfigMap = categoryConfigs.reduce(
  (acc, config) => {
    acc[config.category] = config;
    return acc;
  },
  {} as Record<Category, CategoryConfig>,
);

// Helper function to get category configuration
export const getCategoryConfig = (category: Category): CategoryConfig => {
  const config = categoryConfigMap[category];
  if (!config) {
    throw new Error(`Unknown template category: ${category as string}`);
  }
  return config;
};
