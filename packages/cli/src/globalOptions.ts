import { Option } from "commander";

export const nonInteractiveOption = new Option(
  "--non-interactive",
  "Never prompt for input; fail with a clear error when required values are missing",
).default(false);
export const debugOption = new Option("--debug", "Run in debug mode").default(false);
