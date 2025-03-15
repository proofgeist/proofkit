import { useState, useMemo, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { Tooltip } from "./Tooltip";

interface Template {
  requireData: boolean;
  label: string;
  hint?: string;
  templatePath: string;
  screenshot?: string;
  tags?: string[];
}

interface TemplateGridProps {
  templates: Record<string, Template>;
}

type TemplateItem = Template & { id: string };
type PackageManager = "npm" | "pnpm" | "yarn";

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
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pr-12 rounded-lg border dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {search.trim() ? (
                <button
                  onClick={() => setSearch("")}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 rounded border border-gray-200 dark:border-zinc-600">
                  /
                </kbd>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map(([key, template]) => (
            <TemplateCard key={key} template={template} templateId={key} />
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

function TemplateCard({
  template,
  templateId,
}: {
  template: Template;
  templateId: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  async function copyCommand() {
    const packageManager = localStorage.getItem(
      "starlight-synced-tabs__packageManager",
    );
    const command = `${packageManager}${
      packageManager === "npm" ? " run" : ""
    } proofkit add page --template ${templateId}`;
    await navigator.clipboard.writeText(command);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  return (
    <div className="border dark:border-zinc-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-zinc-800 h-full flex flex-col">
      <div className="w-full aspect-[16/9] bg-gray-100 dark:bg-zinc-900 relative">
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
        <div className="absolute top-3 right-3">
          <Tooltip
            content={isCopied ? "Copied!" : "Copy install command"}
            variant={isCopied ? "success" : "default"}
          >
            <button
              onClick={() => void copyCommand()}
              className={`w-8 h-8 flex items-center justify-center transition-colors rounded-md bg-white/90 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70 shadow-sm backdrop-blur-sm ${
                isCopied
                  ? "text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              aria-label={isCopied ? "Command copied" : "Copy install command"}
            >
              {isCopied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </button>
          </Tooltip>
        </div>
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
