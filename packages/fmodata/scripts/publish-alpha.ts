/**
 * Publish Alpha Script
 *
 * Builds and publishes the package to npm with the "alpha" tag.
 * Checks npm for existing version and git hash, automatically bumps patch version
 * if git hashes differ or version needs to be incremented.
 * Prompts for confirmation before publishing.
 *
 * Usage:
 *   bun run scripts/publish-alpha.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packagePath = resolve(__dirname, "../package.json");
let packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
const packageName = packageJson.name;
let version = packageJson.version;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function getPublishedVersion(
  packageName: string,
): Promise<{ version: string; gitHead?: string } | null> {
  try {
    const registryUrl = `https://registry.npmjs.org/${packageName}`;
    const response = await fetch(registryUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Package doesn't exist yet
      }
      throw new Error(`Failed to fetch package info: ${response.statusText}`);
    }

    const data = await response.json();

    let version: string | undefined;
    let gitHead: string | undefined;

    // Check for alpha tagged versions first
    if (data["dist-tags"]?.alpha) {
      version = data["dist-tags"].alpha;
      if (version && data.versions?.[version]) {
        gitHead = data.versions[version].gitHead;
      }
    } else if (data["dist-tags"]?.latest) {
      // Fall back to latest if no alpha tag exists
      version = data["dist-tags"].latest;
      if (version && data.versions?.[version]) {
        gitHead = data.versions[version].gitHead;
      }
    }

    if (version) {
      return { version, gitHead };
    }

    return null;
  } catch (error) {
    console.warn(`⚠️  Could not check npm registry: ${error}`);
    return null;
  }
}

function getLocalGitHash(): string | null {
  try {
    const hash = execSync("git rev-parse HEAD", {
      cwd: resolve(__dirname, "../.."),
      encoding: "utf-8",
    }).trim();
    return hash;
  } catch (error) {
    console.warn(`⚠️  Could not get local git hash: ${error}`);
    return null;
  }
}

function hasUncommittedChanges(): { hasChanges: boolean; details: string } {
  try {
    // Check for staged changes
    const staged = execSync("git diff --cached --name-only", {
      cwd: resolve(__dirname, "../.."),
      encoding: "utf-8",
    }).trim();

    // Check for unstaged changes
    const unstaged = execSync("git diff --name-only", {
      cwd: resolve(__dirname, "../.."),
      encoding: "utf-8",
    }).trim();

    // Check for untracked files in this package
    const untracked = execSync(
      "git ls-files --others --exclude-standard packages/fmodata/",
      {
        cwd: resolve(__dirname, "../.."),
        encoding: "utf-8",
      },
    ).trim();

    const changes: string[] = [];
    if (staged) changes.push(`staged: ${staged.split("\n").length} file(s)`);
    if (unstaged)
      changes.push(`unstaged: ${unstaged.split("\n").length} file(s)`);
    if (untracked)
      changes.push(`untracked: ${untracked.split("\n").length} file(s)`);

    return {
      hasChanges: changes.length > 0,
      details: changes.join(", "),
    };
  } catch (error) {
    console.warn(`⚠️  Could not check git status: ${error}`);
    return { hasChanges: false, details: "" };
  }
}

function commitChanges(message: string): void {
  const repoRoot = resolve(__dirname, "../..");
  try {
    // Stage all changes
    execSync("git add -A", {
      cwd: repoRoot,
      encoding: "utf-8",
    });

    // Commit with the provided message
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: repoRoot,
      encoding: "utf-8",
    });

    console.log(`✅ Changes committed: "${message}"`);
  } catch (error) {
    throw new Error(`Failed to commit changes: ${error}`);
  }
}

function compareVersions(v1: string, v2: string): number {
  // Parse semantic versions (handles pre-release versions like alpha)
  const parseVersion = (v: string) => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      // Fallback for non-standard versions
      const parts = v.split(/[.-]/).map(Number);
      return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
        prerelease: null,
      };
    }
    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4] || null,
    };
  };

  const ver1 = parseVersion(v1);
  const ver2 = parseVersion(v2);

  // Compare major, minor, patch
  if (ver1.major !== ver2.major) {
    return ver1.major > ver2.major ? 1 : -1;
  }
  if (ver1.minor !== ver2.minor) {
    return ver1.minor > ver2.minor ? 1 : -1;
  }
  if (ver1.patch !== ver2.patch) {
    return ver1.patch > ver2.patch ? 1 : -1;
  }

  // If versions are equal, pre-release versions are considered lower
  if (ver1.prerelease && !ver2.prerelease) return -1;
  if (!ver1.prerelease && ver2.prerelease) return 1;
  if (ver1.prerelease && ver2.prerelease) {
    // Compare prerelease strings (e.g., "alpha.0" vs "alpha.1")
    return ver1.prerelease.localeCompare(ver2.prerelease);
  }

  return 0;
}

function bumpVersion(
  currentVersion: string,
  type: "patch" | "minor" | "major",
): string {
  const parts = currentVersion.split(/[.-]/);
  const major = parseInt(parts[0]) || 0;
  const minor = parseInt(parts[1]) || 0;
  const patch = parseInt(parts[2]) || 0;

  if (type === "major") {
    return `${major + 1}.0.0-alpha.0`;
  } else if (type === "minor") {
    return `${major}.${minor + 1}.0-alpha.0`;
  } else {
    // patch - increment the alpha number if it exists, otherwise start at alpha.0
    const alphaMatch = currentVersion.match(/alpha\.(\d+)$/);
    if (alphaMatch) {
      const alphaNum = parseInt(alphaMatch[1]);
      return currentVersion.replace(/alpha\.\d+$/, `alpha.${alphaNum + 1}`);
    }
    return `${major}.${minor}.${patch + 1}-alpha.0`;
  }
}

function autoBumpPatch(fromVersion?: string): string {
  return bumpVersion(fromVersion ?? version, "patch");
}

async function updateVersion(newVersion: string) {
  packageJson.version = newVersion;
  writeFileSync(
    packagePath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf-8",
  );
  version = newVersion;
  console.log(`✅ Version updated to ${newVersion}`);
}

async function main() {
  try {
    // Check for uncommitted changes first
    const gitStatus = hasUncommittedChanges();
    if (gitStatus.hasChanges) {
      console.log(`\n⚠️  You have uncommitted changes (${gitStatus.details})`);
      console.log("   These must be committed before publishing.\n");

      const commitMessage = await question(
        "Enter commit message (or leave empty to cancel): ",
      );

      if (!commitMessage.trim()) {
        console.log("❌ Publish cancelled - no commit message provided.");
        rl.close();
        process.exit(0);
      }

      commitChanges(commitMessage.trim());
    }

    console.log(`\n📦 Checking npm registry for ${packageName}...`);

    // Check npm for published version
    const publishedInfo = await getPublishedVersion(packageName);
    const localGitHash = getLocalGitHash();

    if (publishedInfo) {
      const publishedVersion = publishedInfo.version;
      const publishedGitHash = publishedInfo.gitHead;

      console.log(`   Published version: ${publishedVersion}`);
      if (publishedGitHash) {
        console.log(
          `   Published git hash: ${publishedGitHash.substring(0, 7)}`,
        );
      }
      console.log(`   Local version: ${version}`);
      if (localGitHash) {
        console.log(`   Local git hash: ${localGitHash.substring(0, 7)}`);
      }

      const comparison = compareVersions(version, publishedVersion);
      const gitHashesMatch =
        publishedGitHash && localGitHash && publishedGitHash === localGitHash;

      if (comparison <= 0) {
        // Version needs to be bumped
        if (gitHashesMatch) {
          console.log(
            `\n⚠️  Local version (${version}) is not greater than published version (${publishedVersion}), but git hashes match.`,
          );
          console.log("❌ Cannot publish without bumping version.");
          rl.close();
          process.exit(0);
        } else {
          // Git hashes differ, auto-bump patch version from the HIGHER version
          // (usually the published version when local is behind)
          const versionToBumpFrom = comparison < 0 ? publishedVersion : version;
          console.log(
            `\n🔄 Git hashes differ - automatically bumping from ${versionToBumpFrom}...`,
          );
          const newVersion = autoBumpPatch(versionToBumpFrom);
          await updateVersion(newVersion);
        }
      } else {
        // Local version is greater than published version (not yet published)
        console.log(`✅ Local version is newer than published version`);
        if (gitHashesMatch) {
          console.log(`✅ Git hashes match`);
        }
      }
    } else {
      console.log(`   No published version found (first publish)`);
    }

    console.log(`\n📦 Ready to publish:`);
    console.log(`   Package: ${packageName}`);
    console.log(`   Version: ${version}`);
    console.log(`   Tag: alpha\n`);

    // Build the package
    console.log("🔨 Building package...");
    process.env.NODE_ENV = "production";
    execSync("pnpm build", {
      cwd: resolve(__dirname, ".."),
      stdio: "inherit",
    });
    console.log("✅ Build complete!\n");

    // Prompt for confirmation
    const answer = await question(
      `Continue with publish of ${packageName}@${version}? (y/n): `,
    );

    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      console.log("❌ Publish cancelled.");
      rl.close();
      process.exit(0);
    }

    // Publish with npm (will prompt for 2FA interactively if needed)
    console.log("\n🚀 Publishing to npm with tag 'alpha'...");
    execSync("npm publish --tag alpha --access public --", {
      cwd: resolve(__dirname, ".."),
      stdio: "inherit",
    });

    // Also update the 'latest' tag since there's no production version yet
    console.log("\n🏷️  Updating 'latest' tag...");
    execSync(`npm dist-tag add ${packageName}@${version} latest`, {
      cwd: resolve(__dirname, ".."),
      stdio: "inherit",
    });

    console.log("\n✅ Successfully published!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    rl.close();
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
