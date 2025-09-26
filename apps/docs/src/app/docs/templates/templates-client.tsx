"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Package } from "lucide-react";
import type { TemplateWithPath } from "@/lib/templates";
import {
  getCategoryConfig,
  categoryConfigs,
  type CategoryConfig,
} from "./category-config";
import type { TemplateMetadata } from "@proofkit/registry";

type Category = TemplateMetadata["category"];

interface TemplatesPageClientProps {
  templates: TemplateWithPath[];
  templatesByCategory: Record<Category, TemplateWithPath[]>;
}

export function TemplatesPageClient({
  templates,
  templatesByCategory,
}: TemplatesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

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
      filtered = filtered.filter(
        (template) => template.category === selectedCategory,
      );
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All ({templates.length})
          </button>
          {categories.map((category) => {
            const config = getCategoryConfig(category);
            const CategoryIcon = config.icon;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
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
          <p className="text-sm text-muted-foreground">
            {filteredTemplates.length} template
            {filteredTemplates.length !== 1 ? "s" : ""} found
            {selectedCategory && (
              <span>
                {" "}
                in{" "}
                <span className="font-medium">
                  {getCategoryConfig(selectedCategory).name}
                </span>
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
                key={template.name}
                href={`/docs${template.path}`}
                className="group block p-6 border border-border rounded-lg bg-card hover:shadow-md transition-all duration-200 hover:border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">
                    {(() => {
                      const CategoryIcon = getCategoryConfig(
                        template.category,
                      ).icon;
                      return <CategoryIcon className="h-5 w-5 text-primary" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                        {template.category}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {template.name}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No templates found
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || selectedCategory
                ? "Try adjusting your search or filter criteria."
                : "There are no templates available at the moment."}
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
                className="mt-4 text-sm text-primary hover:underline"
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
