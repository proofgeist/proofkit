import Link from "next/link";

import ProofKitLogo from "@/../public/proofkit.png";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Separator } from "@/components/ui/separator";

import Image from "next/image";
import { Card } from "fumadocs-ui/components/card";
import { Cards } from "fumadocs-ui/components/card";
import { Code, Globe, Terminal, WebhookIcon } from "lucide-react";
import { InteractiveGridPattern } from "@/components/magicui/interactive-grid-pattern";
import { cn } from "@/lib/utils";
import InitCommand from "@/components/InitCommand";

export default function HomePage() {
  return (
    <main className="flex text-center mb-42 mt-24">
      <div className="flex flex-col items-center justify-center w-full mx-auto max-w-screen-lg">
        <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg  bg-background">
          <InteractiveGridPattern
            className={cn(
              "absolute inset-0 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
            )}
            width={40}
            height={40}
            squares={[80, 80]}
            squaresClassName="hover:fill-brand/50"
            style={{ zIndex: 0 }}
          />
          <Image
            src={ProofKitLogo}
            alt="ProofKit Logo"
            width={400}
            className="z-10 pointer-events-none"
          />
        </div>

        <div className="mt-8 space-y-8 text-center w-full ">
          <h1 className="text-4xl font-bold">Welcome</h1>
          <p className="text-xl text-gray-500 font-medium">
            A collection of tools for building great JavaScript applications
          </p>

          <Cards className="px-4 text-left">
            <Card icon={<Terminal />} title="ProofKit CLI" href="/docs/cli">
              A command line tool to start a new project, or easily apply
              templates and common patterns.
            </Card>
            <Card icon={<Code />} href="/docs/typegen" title={"Typegen"}>
              Automatically generate runtime validators and TypeScript files
              from your own FileMaker layouts.
            </Card>
            <Card
              icon={<WebhookIcon className="text-blue-300" />}
              title="Filemaker Data API"
              href="/docs/fmdapi"
            >
              A type-safe API for your FileMaker layouts. Easily connect without
              worrying about token management.
            </Card>
            <Card
              icon={<Globe />}
              title="FileMaker Webviewer"
              href="/docs/webviewer"
            >
              Use async functions in WebViewer code to run and get results from
              FileMaker scripts.
            </Card>
          </Cards>

          <Separator className="my-12" />

          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col text-left ">
              <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
              <p className="text-lg text-gray-600 mb-0">
                Use the ProofKit CLI to launch a full-featured Next.js app in
                minutes—no prior experience required.
              </p>
            </div>

            <div className="flex flex-col md:flex-row text-left">
              <div className="min-w-96">
                <InitCommand />
              </div>

              <div className="flex flex-col text-left mt-6 md:mt-0 p-4 md:p-6 rounded-lg bg-background/50">
                <p>
                  Check out the{" "}
                  <Link
                    href="/docs/cli/guides/getting-started"
                    className="text-primary underline hover:opacity-80 transition"
                  >
                    full getting started guide
                  </Link>{" "}
                  for more detailed explanations and prerequisites.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
