export function isMissingDependencyError(error: unknown, packageName: string): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  if (candidate.code !== "ERR_MODULE_NOT_FOUND" && candidate.code !== "MODULE_NOT_FOUND") {
    return false;
  }

  return message.includes(packageName);
}

export function createMissingDependencyError(packageName: string, feature: string): Error {
  return new Error(`Missing optional dependency ${packageName}. Install it to use ${feature}.`);
}

export function rethrowMissingDependency(error: unknown, packageName: string, feature: string): never {
  if (isMissingDependencyError(error, packageName)) {
    throw createMissingDependencyError(packageName, feature);
  }

  throw error;
}
