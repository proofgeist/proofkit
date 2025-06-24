import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import { type AvailableDependencies } from "~/installers/dependencyVersionMap.js";
import { state } from "~/state.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

const BASE_DEPS = [
  "@radix-ui/react-slot",
  "@tailwindcss/postcss",
  "class-variance-authority",
  "clsx",
  "lucide-react",
  "tailwind-merge",
  "tailwindcss",
  "tw-animate-css",
] as AvailableDependencies[];
const BASE_DEV_DEPS = [
  "prettier",
  "prettier-plugin-tailwindcss",
] as AvailableDependencies[];

export async function addShadcn() {
  const projectDir = state.projectDir;

  const TEMPLATE_ROOT = path.join(PKG_ROOT, "template/nextjs");

  // 1. Add dependencies
  addPackageDependency({
    dependencies: BASE_DEPS,
    devMode: false,
    projectDir,
  });
  addPackageDependency({
    dependencies: BASE_DEV_DEPS,
    devMode: true,
    projectDir,
  });

  // 2. Copy config and utility files
  fs.copySync(
    path.join(TEMPLATE_ROOT, "components.json"),
    path.join(projectDir, "components.json")
  );
  fs.copySync(
    path.join(TEMPLATE_ROOT, ".prettierrc"),
    path.join(projectDir, ".prettierrc")
  );
  fs.copySync(
    path.join(TEMPLATE_ROOT, "postcss.config.cjs"),
    path.join(projectDir, "postcss.config.cjs")
  );
  fs.copySync(
    path.join(TEMPLATE_ROOT, "src/utils/styles.ts"),
    path.join(projectDir, "src/utils/styles.ts")
  );
  fs.copySync(
    path.join(TEMPLATE_ROOT, "src/config/theme/globals.css"),
    path.join(projectDir, "src/config/theme/globals.css")
  );

  // 3. Install dependencies
  const { execa } = await import("execa");
  await execa("pnpm", ["install"], { cwd: projectDir, stdio: "inherit" });

  // 4. Success message
  console.log(
    "\n✅ shadcn/ui + Tailwind v4 upgrade complete! Please review your configs and test your app.\n"
  );
}
