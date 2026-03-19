import { Effect } from "effect";
import { DOCS_URL } from "~/consts.js";
import { ConsoleService } from "~/core/context.js";

export const runPrompt = Effect.gen(function* () {
  const consoleService = yield* ConsoleService;

  consoleService.note(
    [
      "Agent-ready prompts are coming soon.",
      "",
      "This command will become the stable entrypoint for docs-linked AI workflows.",
      `For now, use package-native tools directly and check docs: ${DOCS_URL}/docs/cli`,
    ].join("\n"),
    "Coming soon",
  );
});
