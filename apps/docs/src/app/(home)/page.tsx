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

          <h2 className="text-3xl font-bold">New to web development?</h2>
          <p className="text-xl text-gray-500">
            The ProofKit CLI is the best way to get a new project started
            quickly without any prior experience. Get a full Next.js app running
            in a matter of minutes!
          </p>
          <Link href="/docs/cli">
            <ShimmerButton className="mx-auto">
              <span className="text-white">Get Started</span>
            </ShimmerButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
