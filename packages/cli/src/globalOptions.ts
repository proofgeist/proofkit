import { Option } from "commander";

export const ciOption = new Option("--ci", "Run in CI mode").default(false);
export const debugOption = new Option("--debug", "Run in debug mode").default(false);
