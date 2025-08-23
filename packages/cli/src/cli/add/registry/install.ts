import { getOtherProofKitDependencies } from "@proofkit/registry";
import { uniq } from "es-toolkit";
import ora from "ora";
import semver from "semver";

import { getRegistryUrl, shadcnInstall } from "~/helpers/shadcn-cli.js";
import { getVersion } from "~/utils/getProofKitVersion.js";
import { logger } from "~/utils/logger.js";
import { getSettings, mergeSettings } from "~/utils/parseSettings.js";
import { getMetaFromRegistry } from "./getOptions.js";
import {
  buildHandlebarsData,
  getFilePath,
  randerHandlebarsToFile,
} from "./postInstall/handlebars.js";
import { processPostInstallStep } from "./postInstall/index.js";
import { preflightAddCommand } from "./preflight.js";

export async function installFromRegistry(name: string) {
  const spinner = ora("Validating template").start();
  await preflightAddCommand();

  try {
    const meta = await getMetaFromRegistry(name);
    if (!meta) {
      spinner.fail(`Template ${name} not found in the ProofKit registry`);
      return;
    }

    if (
      meta.minimumProofKitVersion &&
      semver.gt(meta.minimumProofKitVersion, getVersion())
    ) {
      logger.error(
        `Template ${name} requires ProofKit version ${meta.minimumProofKitVersion}, but you are using version ${getVersion()}`
      );
      spinner.fail("Template is not compatible with your ProofKit version");
      return;
    }
    spinner.succeed();

    const otherProofKitDependencies = getOtherProofKitDependencies(meta);

    const previouslyInstalledTemplates = getSettings().registryTemplates;

    // if dynamic, figure out what fields to pass, then construct the URL to send to shadcn. Otherwise, just send the URL to shadcn
    let url = `${getRegistryUrl()}/r/${name}`;
    if (meta.type === "dynamic") {
      throw new Error("Dynamic templates are not yet supported");
    } else if (meta.type === "static") {
      // just send the URL to shadcn
    } else {
      throw new Error("Unknown template type");
    }

    // run shadcn command
    await shadcnInstall([url], meta.title);

    const handlebarsFiles = meta.files.filter((file) => file.handlebars);

    if (handlebarsFiles.length > 0) {
      const templateData = buildHandlebarsData();
      for (const file of handlebarsFiles) {
        await randerHandlebarsToFile(file, templateData);
      }
    }

    // if post-install steps, process those
    if (meta.postInstall) {
      for (const step of meta.postInstall) {
        if (step._from && previouslyInstalledTemplates.includes(step._from)) {
          // don't re-run post-install steps for templates that have already been installed
          continue;
        }
        await processPostInstallStep(step);
      }
    }

    // update the settings
    mergeSettings({
      registryTemplates: uniq([
        ...previouslyInstalledTemplates,
        name,
        ...otherProofKitDependencies,
      ]),
    });
  } catch (error) {
    spinner.fail("Failed to fetch template metadata.");
    logger.error(error);
  }
}
