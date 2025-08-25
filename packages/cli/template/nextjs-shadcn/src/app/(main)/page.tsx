"use client";

import {
  IconBrandGithub,
  IconExternalLink,
  IconCopy,
  IconCheck,
  IconTerminal,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function InlineSnippet({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    if (typeof window === "undefined" || !navigator.clipboard?.writeText)
      return;
    navigator.clipboard.writeText(command).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  return (
    <div className="bg-muted relative w-full overflow-hidden rounded-md border text-left">
      <div className="flex items-center gap-2 px-3 py-2">
        <IconTerminal size={16} className="text-muted-foreground" />
        <div className="flex-1 overflow-x-auto text-left">
          <code className="font-mono text-sm whitespace-nowrap md:text-base">
            {command}
          </code>
        </div>
        <Button
          onClick={onCopy}
          size="icon"
          variant="ghost"
          aria-label={copied ? "Copied" : "Copy"}
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height,56px))] flex-col">
      <div className="mx-auto mt-20 max-w-screen-md px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <img
            src="https://raw.githubusercontent.com/proofgeist/proofkit/dde6366c529104658dfba67a8fc2910a8644fc64/docs/src/assets/proofkit.png"
            alt="ProofKit"
            className="h-auto max-h-64 w-auto"
          />
          <h1 className="text-foreground text-3xl font-bold">Welcome!</h1>

          <p className="text-muted-foreground text-base text-balance">
            This is the base template home page. To add more pages, components,
            or other features, run the ProofKit CLI from within your project.
          </p>

          <InlineSnippet command="pnpm proofkit" />

          <p className="text-muted-foreground text-base text-balance">
            To change this page, open <code>src/app/(main)/page.tsx</code>
          </p>
          <div>
            <Button asChild variant="outline">
              <a href="https://proofkit.dev" target="_blank" rel="noreferrer">
                ProofKit Docs <IconExternalLink size={16} />
              </a>
            </Button>
          </div>
        </div>
      </div>
      <div className="border-border mt-auto border-t py-4">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4">
          <div className="text-muted-foreground text-sm">
            Sponsored by{" "}
            <a
              href="https://proofgeist.com"
              target="_blank"
              rel="proofkit-app"
              className="text-foreground hover:text-primary underline"
            >
              Proof+Geist
            </a>{" "}
            and{" "}
            <a
              href="https://ottomatic.cloud"
              target="_blank"
              rel="proofkit-app"
              className="text-foreground hover:text-primary underline"
            >
              Ottomatic
            </a>
          </div>
          <div>
            <a
              href="https://github.com/proofgeist/proofkit"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              <IconBrandGithub size={20} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
