"use client";

import type { TemplateMetadata } from "@proofkit/registry";
import { Package, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { TemplateWithPath } from "@/lib/templates";
import { categoryConfigs, getCategoryConfig } from "./category-config";

type Category = TemplateMetadata["category"];

interface TemplatesPageClientProps {
  templates: TemplateWithPath[];
  templatesByCategory: Record<Category, TemplateWithPath[]>;
}

export function TemplatesPageClient({ templates, templatesByCategory }: TemplatesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.title.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query) ||
          template.name.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query),
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((template) => template.category === selectedCategory);
    }

    return filtered;
  }, [templates, searchQuery, selectedCategory]);

  // Use category configuration order instead of alphabetical sort
  const categories = categoryConfigs
    .filter((config) => templatesByCategory[config.category]?.length > 0)
    .map((config) => config.category);

  return (
    <div>
      {/* Search and filters */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              type="text"
              value={searchQuery}
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
            onClick={() => setSelectedCategory(null)}
            type="button"
          >
            All ({templates.length})
          </button>
          {categories.map((category) => {
            const config = getCategoryConfig(category);
            const CategoryIcon = config.icon;
            return (
              <button
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                key={category}
                onClick={() => setSelectedCategory(category)}
                type="button"
              >
                <CategoryIcon className="h-3.5 w-3.5" />
                {config.name} ({templatesByCategory[category].length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main>
        {/* Results header */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">
            {filteredTemplates.length} template
            {filteredTemplates.length !== 1 ? "s" : ""} found
            {selectedCategory && (
              <span>
                {" "}
                in <span className="font-medium">{getCategoryConfig(selectedCategory).name}</span>
              </span>
            )}
            {searchQuery && (
              <span>
                {" "}
                matching "<span className="font-medium">{searchQuery}</span>"
              </span>
            )}
          </p>
        </div>

        {/* Templates grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Link
                className="group block rounded-lg border border-border bg-card p-6 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
                href={`/docs${template.path}`}
                key={template.name}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    {(() => {
                      const CategoryIcon = getCategoryConfig(template.category).icon;
                      return <CategoryIcon className="h-5 w-5 text-primary" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                      {template.title}
                    </h3>
                    {template.description && (
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">{template.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground text-xs capitalize">
                        {template.category}
                      </span>
                      <span className="font-mono text-muted-foreground text-xs">{template.name}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-semibold text-lg text-muted-foreground">No templates found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || selectedCategory
                ? "Try adjusting your search or filter criteria."
                : "There are no templates available at the moment."}
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                className="mt-4 text-primary text-sm hover:underline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
                type="button"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
