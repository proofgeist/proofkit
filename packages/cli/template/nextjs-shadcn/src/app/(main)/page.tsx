import { IconBrandGithub, IconExternalLink } from "@tabler/icons-react";

export default function Home() {
  return (
    <>
      <div className="mx-auto mt-20 max-w-screen-md px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <img
            src="https://raw.githubusercontent.com/proofgeist/proofkit/dde6366c529104658dfba67a8fc2910a8644fc64/docs/src/assets/proofkit.png"
            alt="ProofKit"
            className="h-auto max-h-64 w-auto"
          />
          <h1 className="text-3xl font-bold">Welcome!</h1>

          <p className="text-balance text-base text-zinc-700 dark:text-zinc-300">
            This is the base template home page. To add more pages, components,
            or other features, run the ProofKit CLI from within your project.
          </p>
          <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm dark:bg-zinc-800">
            __PNPM_COMMAND__ proofkit
          </code>

          <p className="text-balance text-base text-zinc-700 dark:text-zinc-300">
            To change this page, open <code>src/app/(main)/page.tsx</code>
          </p>
          <div>
            <a
              href="https://proofkit.dev"
              target="_blank"
              rel="proofkit-app"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              ProofKit Docs <IconExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
      <footer className="mt-10 border-t border-zinc-200 py-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Sponsored by {" "}
            <a
              href="https://proofgeist.com"
              target="_blank"
              rel="proofkit-app"
              className="underline"
            >
              Proof+Geist
            </a>{" "}
            and {" "}
            <a
              href="https://ottomatic.cloud"
              target="_blank"
              rel="proofkit-app"
              className="underline"
            >
              Ottomatic
            </a>
          </div>
          <div>
            <a href="https://github.com/proofgeist/proofkit" target="_blank" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white">
              <IconBrandGithub size={20} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
