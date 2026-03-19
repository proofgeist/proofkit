import { Data } from "effect";

export class CliValidationError extends Data.TaggedError("CliValidationError")<{
  readonly message: string;
}> {}

export class UserCancelledError extends Data.TaggedError("UserCancelledError")<{
  readonly message: string;
}> {}

export class NonInteractiveInputError extends Data.TaggedError("NonInteractiveInputError")<{
  readonly message: string;
}> {}

export class DirectoryConflictError extends Data.TaggedError("DirectoryConflictError")<{
  readonly message: string;
  readonly path: string;
}> {}

export class FileMakerSetupError extends Data.TaggedError("FileMakerSetupError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class RegistryError extends Data.TaggedError("RegistryError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class ExternalCommandError extends Data.TaggedError("ExternalCommandError")<{
  readonly message: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly cause?: unknown;
}> {}

export class FileSystemError extends Data.TaggedError("FileSystemError")<{
  readonly message: string;
  readonly operation: string;
  readonly path: string;
  readonly cause?: unknown;
}> {}

export type CliError =
  | CliValidationError
  | UserCancelledError
  | NonInteractiveInputError
  | DirectoryConflictError
  | FileMakerSetupError
  | RegistryError
  | ExternalCommandError
  | FileSystemError;

const cliErrorTags = new Set<string>([
  "CliValidationError",
  "UserCancelledError",
  "NonInteractiveInputError",
  "DirectoryConflictError",
  "FileMakerSetupError",
  "RegistryError",
  "ExternalCommandError",
  "FileSystemError",
]);

export function isCliError(error: unknown): error is CliError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    typeof error._tag === "string" &&
    cliErrorTags.has(error._tag)
  );
}

export function getCliErrorMessage(error: CliError) {
  return error.message;
}
