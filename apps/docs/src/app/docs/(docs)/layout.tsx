import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { DocsLayout } from "@/components/layout/docs";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
      sidebar={{
        footer: (
          <div className="mt-2 flex items-center justify-center text-muted-foreground text-xs">
            <p>
              Made with ❤️ by{" "}
              <a className="underline" href="https://proofgeist.com" rel="noopener" target="_blank">
                Proof+Geist
              </a>
            </p>
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
