import { type Template } from "@proofkit/shared";
import { useState, useMemo, useEffect, useRef } from "react";
import Fuse from "fuse.js";

interface TemplateGridProps {
  templates: Record<string, Template>;
}

type TemplateItem = Template & { id: string };

export function TemplateGrid({ templates }: TemplateGridProps) {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if user is typing in an input or textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (
        event.key === "/" ||
        (event.key === "f" && (event.metaKey || event.ctrlKey))
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fuse = useMemo(() => {
    const options = {
      keys: [
        { name: "label", weight: 1 },
        { name: "hint", weight: 0.5 },
        { name: "tags", weight: 0.3 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
    };

    const templatesArray = Object.entries(templates).map(([id, template]) => ({
      id,
      ...template,
    }));

    return new Fuse<TemplateItem>(templatesArray, options);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      return Object.entries(templates);
    }

    return fuse
      .search(trimmedSearch)
      .map(({ item }) => [item.id, templates[item.id]] as [string, Template]);
  }, [search, fuse, templates]);

  return (
    <div className="not-content">
      <div className="space-y-6">
        <div className="relative flex items-center">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 pr-16 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <div className="absolute right-3">
            {search.trim() ? (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Clear
              </button>
            ) : (
              <kbd className="hidden sm:flex items-center justify-center px-2 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 rounded border border-gray-200 dark:border-zinc-600">
                /
              </kbd>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map(([key, template]) => (
            <TemplateCard key={key} template={template} />
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No templates found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="border dark:border-zinc-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-zinc-800 h-full flex flex-col">
      <div className="w-full aspect-[16/9] bg-gray-100 dark:bg-zinc-900">
        {template.screenshot ? (
          <img
            src={template.screenshot}
            alt={`Screenshot of ${template.label} template`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            No Preview
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold">{template.label}</h3>
          {!template.requireData && (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full flex-shrink-0 ml-2">
              No Data Required
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {template.hint || "A blank page template"}
        </p>
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
