import { execSync } from "child_process";
import https from "https";
import * as p from "@clack/prompts";
import chalk from "chalk";

import { cliName, npmName } from "~/consts.js";
import { getVersion } from "./getProofKitVersion.js";
import { getUserPkgManager } from "./getUserPkgManager.js";
import { logger } from "./logger.js";

export const renderVersionWarning = (npmVersion: string) => {
  const currentVersion = getVersion();

  if (currentVersion.includes("beta")) {
    logger.warn(`  You are using a beta version of ${cliName}.`);
    logger.warn("  Please report any bugs you encounter.");
  } else if (currentVersion !== npmVersion) {
    logger.warn(`  You are using an outdated version of ${cliName}.`);
    logger.warn(
      "  Your version:",
      currentVersion + ".",
      "Latest version in the npm registry:",
      npmVersion
    );
    logger.warn("  Please run the CLI with @latest to get the latest updates.");
  }
  console.log("");
};

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root
 * directory of this source tree.
 * https://github.com/facebook/create-react-app/blob/main/packages/create-react-app/LICENSE
 */
interface DistTagsBody {
  latest: string;
}

function checkForLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(
        "https://registry.npmjs.org/-/package/@proofgeist/kit/dist-tags",
        (res) => {
          if (res.statusCode === 200) {
            let body = "";
            res.on("data", (data) => (body += data));
            res.on("end", () => {
              resolve((JSON.parse(body) as DistTagsBody).latest);
            });
          } else {
            reject();
          }
        }
      )
      .on("error", () => {
        // logger.error("Unable to check for latest version.");
        reject();
      });
  });
}

export const getNpmVersion = async () =>
  // `fetch` to the registry is faster than `npm view` so we try that first
  checkForLatestVersion().catch(() => {
    try {
      return execSync("npm view proofkit version").toString().trim();
    } catch {
      return null;
    }
  });

export const checkAndRenderVersionWarning = async () => {
  const npmVersion = await getNpmVersion();
  const currentVersion = getVersion();
  if (currentVersion !== npmVersion) {
    const pkgManager = getUserPkgManager();
    p.log.warn(
      `${chalk.yellow(
        `You are using an outdated version of ${cliName}.`
      )} Your version: ${currentVersion}. Latest version: ${npmVersion}.
      Run ${chalk.magenta.bold(`${pkgManager} install ${npmName}@latest`)} to get the latest updates.`
    );
  }
  return { npmVersion, currentVersion };
};
