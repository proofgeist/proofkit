import { useEffect, useState } from "react";

type PackageManager = "npm" | "pnpm" | "yarn";

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1.25rem"
      height="1.25rem"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        position: "relative",
        gap: "0.25rem",
        color: "var(--sl-color-gray-1)",
      }}
    >
      <select
        value={packageManager}
        onChange={(e) => setPackageManager(e.target.value as PackageManager)}
        className="sl-select"
        style={{
          WebkitAppearance: "none",
          MozAppearance: "none",
          appearance: "none",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          padding: "0.625rem",
          paddingInlineEnd: "calc(1.25rem + 0.5rem + 0.25rem)",
          margin: 0,
          marginInline: "calc(0.5rem * -1)",
          width: "6.25em",
          font: "inherit",
          color: "inherit",
          opacity: 0.8,
        }}
      >
        <option
          value="pnpm"
          style={{
            color: "var(--sl-color-gray-1)",
            background: "var(--sl-color-bg-nav)",
          }}
        >
          pnpm
        </option>
        <option
          value="npm"
          style={{
            color: "var(--sl-color-gray-1)",
            background: "var(--sl-color-bg-nav)",
          }}
        >
          npm
        </option>
        <option
          value="yarn"
          style={{
            color: "var(--sl-color-gray-1)",
            background: "var(--sl-color-bg-nav)",
          }}
        >
          yarn
        </option>
      </select>
      <ChevronDownIcon
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          right: 0,
          pointerEvents: "none",
          opacity: 0.8,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
