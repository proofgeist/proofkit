import { useEffect, useState } from "react";

type PackageManager = "npm" | "pnpm" | "yarn";

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PackageManagerSelect() {
  const [packageManager, setPackageManager] = useState<PackageManager>("pnpm");

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage?.getItem(
      "starlight-synced-tabs__packageManager",
    );
    if (stored === "npm" || stored === "pnpm" || stored === "yarn") {
      setPackageManager(stored);
    }
  }, []);

  // Update tabs and localStorage when package manager changes
  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "starlight-synced-tabs__packageManager",
        packageManager,
      );
    }

    // Find all tab elements with the syncKey "packageManager"
    const starlightTabs = document.querySelectorAll(
      'starlight-tabs[data-sync-key="packageManager"]',
    );

    starlightTabs.forEach((tabsElement) => {
      // Find the tab with matching label
      const tab = [...tabsElement.querySelectorAll('[role="tab"]')].find(
        (tab) => tab.textContent?.trim() === packageManager,
      );

      if (tab && tab instanceof HTMLElement) {
        // Simulate a click on the tab to trigger Starlight's built-in syncing
        tab.click();
      }
    });
  }, [packageManager]);

  // Listen for changes in the Starlight tabs
  useEffect(() => {
    function handleTabChange(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        target.getAttribute("role") === "tab" &&
        target.closest('starlight-tabs[data-sync-key="packageManager"]')
      ) {
        const newValue = target.textContent?.trim();
        if (newValue === "npm" || newValue === "pnpm" || newValue === "yarn") {
          setPackageManager(newValue);
        }
      }
    }

    // Listen for clicks on all tab elements
    document.addEventListener("click", handleTabChange);
    return () => document.removeEventListener("click", handleTabChange);
  }, []);

  useEffect(() => {
    function updatePackageManager(event: StorageEvent) {
      if (
        event.key === "starlight-synced-tabs__packageManager" &&
        event.newValue
      ) {
        if (
          event.newValue === "npm" ||
          event.newValue === "pnpm" ||
          event.newValue === "yarn"
        ) {
          setPackageManager(event.newValue as PackageManager);
        }
      }
    }

    window.addEventListener("storage", updatePackageManager);
    return () => window.removeEventListener("storage", updatePackageManager);
  }, []);

  return (
    <div className="flex items-center gap-1 text-sm">
      <select
        value={packageManager}
        onChange={(e) => setPackageManager(e.target.value as PackageManager)}
        className="appearance-none bg-transparent text-gray-100 hover:text-white focus:outline-none cursor-pointer"
      >
        <option value="pnpm">pnpm</option>
        <option value="npm">npm</option>
        <option value="yarn">yarn</option>
      </select>
      <ChevronDownIcon className="text-gray-400" aria-hidden="true" />
    </div>
  );
}
