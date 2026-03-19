const NON_INTERACTIVE_ENV_VARS = [
  "CI",
  "GITHUB_ACTIONS",
  "CODEX",
  "OPENAI_CODEX",
  "CLAUDE_CODE",
  "JENKINS_URL",
  "BUILDKITE",
] as const;

export function detectNonInteractiveTerminal(options?: {
  stdinIsTTY?: boolean;
  stdoutIsTTY?: boolean;
  env?: NodeJS.ProcessEnv;
}) {
  const env = options?.env ?? process.env;
  const hasTTY = options?.stdinIsTTY === true && options?.stdoutIsTTY === true;
  const hasNonInteractiveEnv = NON_INTERACTIVE_ENV_VARS.some((name) => Boolean(env[name]));
  const hasDumbTerm = env.TERM === "dumb";
  return !hasTTY || hasNonInteractiveEnv || hasDumbTerm;
}

export function resolveNonInteractiveMode(options?: {
  CI?: boolean;
  nonInteractive?: boolean;
  stdinIsTTY?: boolean;
  stdoutIsTTY?: boolean;
  env?: NodeJS.ProcessEnv;
}) {
  if (options?.nonInteractive === true || options?.CI === true) {
    return true;
  }

  return detectNonInteractiveTerminal(options);
}
