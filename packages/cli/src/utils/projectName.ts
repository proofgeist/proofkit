import path from "node:path";

const TRAILING_SLASHES_REGEX = /\/+$/;
const PATH_SEPARATOR_REGEX = /\\/g;
const WHITESPACE_REGEX = /\s+/g;
const VALID_APP_NAME_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

function normalizeProjectName(value: string) {
  return value.replace(PATH_SEPARATOR_REGEX, "/");
}

function trimTrailingSlashes(value: string) {
  return normalizeProjectName(value).replace(TRAILING_SLASHES_REGEX, "");
}

function normalizeProjectNameForPackage(value: string) {
  return trimTrailingSlashes(value).replace(WHITESPACE_REGEX, "-").toLowerCase();
}

export function parseNameAndPath(projectName: string): [scopedAppName: string, appDir: string] {
  const normalizedProjectName = trimTrailingSlashes(projectName);
  const segments = normalizedProjectName.split("/");
  const hasScopedPackage = (segments.at(-2) ?? "").startsWith("@");
  const packageSegmentCount = hasScopedPackage ? 2 : 1;
  const leadingSegments = segments.slice(0, -packageSegmentCount);
  const packageSegments = segments.slice(-packageSegmentCount);
  const normalizedPackageSegments = packageSegments.map(normalizeProjectNameForPackage);
  let scopedAppName = normalizedPackageSegments.join("/");
  let appDirPackageSegments = normalizedPackageSegments;

  if (scopedAppName === ".") {
    scopedAppName = normalizeProjectNameForPackage(path.basename(path.resolve(process.cwd())));
    appDirPackageSegments = packageSegments;
  }

  const appDir = [...leadingSegments, ...appDirPackageSegments].join("/");

  return [scopedAppName, appDir];
}

export function validateAppName(projectName: string) {
  const normalized = normalizeProjectNameForPackage(projectName);
  if (normalized === ".") {
    const currentDirName = path.basename(path.resolve(process.cwd()));
    return VALID_APP_NAME_REGEX.test(currentDirName.replace(WHITESPACE_REGEX, "-").toLowerCase())
      ? undefined
      : "Name must consist of only lowercase alphanumeric characters, '-', and '_'";
  }

  const segments = normalized.split("/");
  const scopeIndex = segments.findIndex((segment) => segment.startsWith("@"));
  let scopedAppName = segments.at(-1);

  if (scopeIndex !== -1) {
    scopedAppName = segments.slice(scopeIndex).join("/");
  }

  if (VALID_APP_NAME_REGEX.test(scopedAppName ?? "")) {
    return;
  }

  return "Name must consist of only lowercase alphanumeric characters, '-', and '_'";
}
