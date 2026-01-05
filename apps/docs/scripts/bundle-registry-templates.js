#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * This script copies registry template files into the Next.js build
 * so they're available as static assets in serverless environments
 */

function bundleRegistryTemplates() {
  console.log("📦 Bundling registry templates...");

  try {
    // Source: registry package templates
    const registryPath = path.resolve(__dirname, "../../../packages/registry/templates");

    // Destination: Next.js public directory (served as static assets)
    const publicRegistryPath = path.resolve(__dirname, "../public/registry-templates");

    // Clean and create destination directory
    if (fs.existsSync(publicRegistryPath)) {
      fs.rmSync(publicRegistryPath, { recursive: true });
    }
    fs.mkdirSync(publicRegistryPath, { recursive: true });

    // Copy all template files
    copyDirectory(registryPath, publicRegistryPath);

    console.log("✅ Registry templates bundled successfully!");
    console.log(`📁 Templates available at: ${publicRegistryPath}`);

    // Also create a manifest of all available templates
    const manifest = createTemplateManifest(publicRegistryPath);
    fs.writeFileSync(path.join(publicRegistryPath, "manifest.json"), JSON.stringify(manifest, null, 2));

    console.log(`📋 Template manifest created with ${manifest.templates.length} templates`);
  } catch (error) {
    console.error("❌ Failed to bundle registry templates:", error);
    process.exit(1);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`);
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createTemplateManifest(templatesPath) {
  const templates = [];

  function scanDirectory(dir, relativePath = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath, relPath);
      } else if (entry.name === "_meta.ts") {
        // Found a template directory
        const templatePath = relativePath || ".";
        templates.push({
          name: templatePath.replace(/\\/g, "/"), // normalize path separators
          path: templatePath,
          metaFile: relPath.replace(/\\/g, "/"),
        });
      }
    }
  }

  scanDirectory(templatesPath);

  return {
    generatedAt: new Date().toISOString(),
    templates,
  };
}

bundleRegistryTemplates();
