import { DocsLayout } from "@/components/layout/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { source } from "@/lib/source";
import { ArrowLeft, Package } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
      sidebar={{
        footer: (
          <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
            <p>
              Made with ❤️ by{" "}
              <a
                href="https://proofgeist.com"
                target="_blank"
                className="underline"
              >
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
