import path from "path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import fs from "fs-extra";
import { type PackageJson } from "type-fest";

import { ciOption, debugOption } from "~/globalOptions.js";
import { initProgramState, state } from "~/state.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { getSettings } from "~/utils/parseSettings.js";
import { ensureProofKitProject } from "../utils.js";

async function checkVercelCLI(): Promise<boolean> {
  try {
    await execa("vercel", ["--version"]);
    return true;
  } catch (error) {
    return false;
  }
}

async function installVercelCLI() {
  const pkgManager = getUserPkgManager();
  const spinner = p.spinner();
  spinner.start("Installing Vercel CLI...");

  try {
    const installCmd = pkgManager === "npm" ? "install" : "add";
    await execa(pkgManager, [installCmd, "-g", "vercel"]);
    spinner.stop("Vercel CLI installed successfully");
    return true;
  } catch (error) {
    spinner.stop("Failed to install Vercel CLI");
    console.error(chalk.red("Error installing Vercel CLI:"), error);
    return false;
  }
}

async function checkVercelProject(): Promise<boolean> {
  try {
    // Try to read the .vercel/project.json file which exists when a project is linked
    const projectConfig = (await fs.readJSON(
      ".vercel/project.json"
    )) as VercelProjectConfig;
    return Boolean(projectConfig.projectId);
  } catch (error) {
    if (state.debug) {
      console.log("\nDebug: No Vercel project configuration found");
    }
    return false;
  }
}

async function getVercelTeams(): Promise<{ slug: string; name: string }[]> {
  try {
    if (state.debug) {
      console.log("\nDebug: Running vercel teams list command...");
    }

    const result = await execa("vercel", ["teams", "list"], {
      all: true,
    });

    if (state.debug) {
      console.log("\nDebug: Command output:", result.all);
    }

    const lines = (result.all ?? "").split("\n").filter(Boolean);

    // Find the index of the header line
    const headerIndex = lines.findIndex((line) => line.trim().startsWith("id"));
    if (headerIndex === -1) {
      return [];
    }

    // Get only the lines after the header
    const teamLines = lines.slice(headerIndex + 1);

    if (state.debug) {
      console.log("\nDebug: Team lines:");
      teamLines.forEach((line) => console.log(`"${line}"`));
    }

    const teams = teamLines
      .map((line) => {
        const match = line.match(/^(\S+)\s+(.+?)\s*$/);
        if (!match) return null;
        return {
          slug: match[1],
          name: match[2],
        };
      })
      .filter((team): team is { slug: string; name: string } => team !== null);

    if (state.debug) {
      console.log("\nDebug: Parsed teams:", teams);
    }

    return teams;
  } catch (error) {
    if (state.debug) {
      console.error("Error getting Vercel teams:", error);
    }
    return [];
  }
}

async function setupVercelProject() {
  const spinner = p.spinner();

  try {
    // Get project name from package.json
    const pkgJson = (await fs.readJSON("package.json")) as PackageJson;
    const projectName = pkgJson.name;

    // Get available teams
    const teams = await getVercelTeams();

    let teamFlag = "";
    if (teams.length > 1) {
      const teamChoice = await p.select({
        message: "Select a team to deploy under:",
        options: [
          ...teams.map((team) => ({
            value: team.slug,
            label: team.name,
          })),
        ],
      });

      if (p.isCancel(teamChoice)) {
        console.log(chalk.yellow("\nOperation cancelled"));
        return false;
      }

      if (teamChoice && typeof teamChoice === "string") {
        teamFlag = `--scope=${teamChoice}`;
      }
    }

    spinner.start("Creating Vercel project...");

    // Create project with default settings
    await execa("vercel", ["link", "--yes", ...(teamFlag ? [teamFlag] : [])], {
      env: {
        VERCEL_PROJECT_NAME: projectName,
      },
    });

    // Pull project settings
    spinner.message("Pulling project settings...");
    await execa("vercel", ["pull", "--yes"], {
      stdio: "inherit",
    });

    spinner.stop("Vercel project created successfully");
    return true;
  } catch (error) {
    spinner.stop("Failed to set up Vercel project");
    console.error(chalk.red("Error setting up Vercel project:"), error);
    return false;
  }
}

async function pushEnvironmentVariables() {
  const spinner = p.spinner();
  spinner.start("Pushing environment variables to Vercel...");

  try {
    const settings = getSettings();
    const envFile = path.join(process.cwd(), settings.envFile);

    if (!fs.existsSync(envFile)) {
      spinner.stop("No environment file found");
      return true;
    }

    const envContent = await fs.readFile(envFile, "utf-8");
    const envVars = envContent
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        if (!key) return null;
        const value = valueParts.join("="); // Rejoin in case value contains =
        return { key: key.trim(), value: value.trim() };
      })
      .filter((item): item is { key: string; value: string } => item !== null);

    if (state.debug) {
      spinner.stop();
      console.log("\nDebug: Parsed environment variables:");
      envVars.forEach(({ key, value }) => {
        console.log(`  ${key}=${value.substring(0, 3)}...`);
      });
      spinner.start("Pushing environment variables to Vercel...");
    }

    let failed = 0;
    const total = envVars.length;

    for (let i = 0; i < total; i++) {
      const { key, value } = envVars[i]!;
      spinner.message(
        `Pushing environment variables to Vercel... (${i + 1}/${total})`
      );

      try {
        if (state.debug) {
          console.log(`\nDebug: Attempting to add ${key} to Vercel...`);
        }

        const result = await execa(
          "vercel",
          ["env", "add", key, "production"],
          {
            input: value,
            stdio: "pipe",
            reject: false,
          }
        );

        if (state.debug) {
          console.log(`Debug: Command exit code: ${result.exitCode}`);
          if (result.stdout) console.log("Debug: stdout:", result.stdout);
          if (result.stderr) console.log("Debug: stderr:", result.stderr);
        }

        if (result.exitCode !== 0) {
          throw new Error(`Command failed with exit code ${result.exitCode}`);
        }
      } catch (error) {
        failed++;
        if (state.debug) {
          console.error(chalk.yellow(`\nDebug: Failed to add ${key}`));
          console.error("Debug: Full error:", error);
        }
      }
    }

    if (failed > 0) {
      spinner.stop(
        chalk.yellow(`Environment variables pushed with ${failed} failures`)
      );
    } else {
      spinner.stop("Environment variables pushed successfully");
    }
    return failed < total;
  } catch (error) {
    spinner.stop("Failed to push environment variables");
    if (state.debug) {
      console.error("\nDebug: Top-level error in pushEnvironmentVariables:");
      console.error(error);
    }
    return false;
  }
}

interface VercelProjectConfig {
  projectId: string;
  settings?: {
    nodeVersion?: string;
  };
  [key: string]: unknown;
}

async function ensureCorrectNodeVersion() {
  const nodeVersion = process.version.replace(/^v/, "");
  const majorVersion = nodeVersion.split(".")[0];

  try {
    const projectJsonPath = ".vercel/project.json";
    if (!fs.existsSync(projectJsonPath)) {
      if (state.debug) {
        console.log("Debug: No project.json found");
      }
      return false;
    }

    const projectConfig = (await fs.readJSON(
      projectJsonPath
    )) as VercelProjectConfig;
    if (state.debug) {
      console.log("Debug: Current project config:", projectConfig);
    }

    // Update the Node.js version
    projectConfig.settings = {
      ...projectConfig.settings,
      nodeVersion: `${majorVersion}.x`,
    };

    await fs.writeJSON(projectJsonPath, projectConfig, { spaces: 2 });
    if (state.debug) {
      console.log(`Debug: Updated Node.js version to ${majorVersion}.x`);
    }
    return true;
  } catch (error) {
    if (state.debug) {
      console.error("Debug: Failed to update Node.js version:", error);
    }
    return false;
  }
}

async function checkVercelLogin(): Promise<boolean> {
  try {
    const result = await execa("vercel", ["whoami"], {
      stdio: "pipe",
      reject: false,
    });

    if (state.debug) {
      console.log("\nDebug: Vercel whoami result:", result);
    }

    return result.exitCode === 0;
  } catch (error) {
    if (state.debug) {
      console.error("Debug: Error checking Vercel login status:", error);
    }
    return false;
  }
}

async function loginToVercel(): Promise<boolean> {
  console.log(chalk.blue("\nYou need to log in to Vercel first."));

  try {
    await execa("vercel", ["login"], {
      stdio: "inherit",
    });
    return true;
  } catch (error) {
    console.error(chalk.red("\nFailed to log in to Vercel:"), error);
    return false;
  }
}

async function runDeploy() {
  // Check if Vercel CLI is installed
  const hasVercelCLI = await checkVercelCLI();

  if (!hasVercelCLI) {
    const installed = await installVercelCLI();
    if (!installed) {
      console.log(
        chalk.red(
          "\nFailed to install Vercel CLI. Please install it manually using:"
        )
      );
      console.log(chalk.blue("\n  npm install -g vercel"));
      return;
    }
  }

  // Check if user is logged in
  const isLoggedIn = await checkVercelLogin();
  if (!isLoggedIn) {
    const loginSuccessful = await loginToVercel();
    if (!loginSuccessful) {
      console.log(chalk.red("\nFailed to log in to Vercel. Please try again."));
      return;
    }
  }

  // Check if project is set up with Vercel
  const hasVercelProject = await checkVercelProject();

  if (!hasVercelProject) {
    console.log(chalk.blue("\nSetting up new Vercel project..."));
    const setup = await setupVercelProject();
    if (!setup) {
      console.log(
        chalk.red("\nFailed to set up Vercel project automatically.")
      );
      return;
    }

    const envPushed = await pushEnvironmentVariables();
    if (!envPushed) {
      console.log(
        chalk.red(
          "\nFailed to push environment variables. Aborting deployment."
        )
      );
      return;
    }
  }

  // Pull latest project settings
  console.log(chalk.blue("\nPulling latest project settings..."));
  try {
    await execa("vercel", ["pull", "--yes"], {
      stdio: "inherit",
    });
  } catch (error) {
    console.error(chalk.red("\nFailed to pull project settings:"), error);
    return;
  }

  // Ensure correct Node.js version is set
  if (!(await ensureCorrectNodeVersion())) {
    console.error(
      chalk.red("\nFailed to set Node.js version. Continuing anyway...")
    );
  }

  // Build for Vercel
  console.log(chalk.blue("\nPreparing build for Vercel..."));
  try {
    await execa("vercel", ["build"], {
      stdio: "inherit",
    });
  } catch (error) {
    console.error(chalk.red("\nVercel build failed:"), error);
    return;
  }

  // Deploy the pre-built project
  console.log(chalk.blue("\nDeploying to Vercel..."));
  try {
    await execa("vercel", ["deploy", "--prebuilt", "--yes"], {
      stdio: "inherit",
    });
    console.log(chalk.green("\n✓ Deployment successful!"));
  } catch (error) {
    console.error(chalk.red("\nDeployment failed:"), error);
  }
}

export const makeDeployCommand = () => {
  const deployCommand = new Command("deploy")
    .description("Deploy your ProofKit application to Vercel")
    .addOption(ciOption)
    .addOption(debugOption)
    .action(runDeploy);

  deployCommand.hook("preAction", (thisCommand) => {
    initProgramState(thisCommand.opts());
    state.baseCommand = "deploy";
    ensureProofKitProject({ commandName: "deploy" });
  });

  return deployCommand;
};
