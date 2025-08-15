This plan will give you a clear, step-by-step guide to building the static component registry within the existing "apps/docs" project.

---

### **High-Level Plan: Phase 1 - Static Registry**

The goal is to create a robust API for static components that is fully compatible with the `shadcn-cli` and can be tested thoroughly.

### **1. The Data Layer: Defining the "Source of Truth"**

This is the most critical part. A well-defined data structure will make the rest of the implementation smooth.

#### **A. Directory Structure**

The directory structure remains the same, providing a clean organization for your templates.

```
src/
└── registry/
    ├── lib/
    │   ├── types.ts          // NEW: Centralized type definitions
    │   ├── validator.ts      // Build-time validation script
    │   └── utils.ts          // File system and data transformation logic
    └── templates/
        ├── button/
        │   ├── _meta.ts
        │   └── button.tsx
        └── icon/
            ├── _meta.ts
            └── index.ts
```

#### **B. Type Definitions (`types.ts`)**

Create a central file for your internal data types. This ensures consistency and provides excellent developer experience with TypeScript.

```typescript
// src/registry/lib/types.ts
import { z } from "zod";

// Defines a single file within a template
export const templateFileSchema = z.object({
  sourceFileName: z.string(),
  destinationPath: z.string(),
});

// Defines the metadata for a single template (_meta.ts)
export const templateMetadataSchema = z.object({
  name: z.string(),
  type: z.literal("static"), // For Phase 1, we only allow 'static'
  description: z.string(),
  categories: z.array(z.enum(["component", "page", "utility", "hook"])),
  files: z.array(templateFileSchema),
});

export type TemplateFile = z.infer<typeof templateFileSchema>;
export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;
```

#### **C. Example Metadata (`_meta.ts`)**

Here is how you would define a `button` component using the new types.

```typescript
// src/registry/templates/button/_meta.ts
import type { TemplateMetadata } from "@/registry/lib/types";

export const meta: TemplateMetadata = {
  name: "button",
  type: "static",
  description: "Displays a button or a link.",
  categories: ["component"],
  files: [
    {
      // The name of the file within this directory
      sourceFileName: "button.tsx",
      // The path where the file will be placed in the user's project
      destinationPath: "src/components/ui/button.tsx",
    },
  ],
};
```

### **2. The API Layer: Building the Registry with Next.js & Hono**

This layer reads from your data source and exposes it in the Shadcn-compatible format.

#### **A. API Route Handler (`route.ts`)**

The Hono router remains the core of the API, providing flexibility for the future.

```typescript
// src/app/api/registry/[...slug]/route.ts
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getRegistryIndex, getStaticComponent } from "@/registry/lib/utils";

export const runtime = "edge";

const app = new Hono().basePath("/api/registry");

// Serves the index of all available components
app.get("/index.json", async (c) => {
  try {
    const index = await getRegistryIndex();
    return c.json(index);
  } catch (error) {
    return c.json({ error: "Failed to fetch registry index." }, 500);
  }
});

// Serves the data for a single component
// The :style param is part of the shadcn spec, we'll include it for compatibility
app.get("/:style/:name.json", async (c) => {
  const { name } = c.req.param();
  try {
    const component = await getStaticComponent(name);
    if (!component) {
      return c.json({ error: "Component not found." }, 404);
    }
    return c.json(component);
  } catch (error) {
    return c.json({ error: "Failed to fetch component." }, 500);
  }
});

export const GET = handle(app);
```

#### **B. Registry Utilities (`utils.ts`)**

These functions are updated to handle the new `sourceFileName` and `destinationPath` structure.

```typescript
// src/registry/lib/utils.ts
import fs from "fs/promises";
import path from "path";
import type { TemplateMetadata } from "./types";

const templatesPath = path.join(process.cwd(), "src/registry/templates");

// Builds the index.json file
export async function getRegistryIndex() {
  const componentDirs = await fs.readdir(templatesPath, {
    withFileTypes: true,
  });
  const index = [];

  for (const dir of componentDirs) {
    if (dir.isDirectory()) {
      const { meta }: { meta: TemplateMetadata } = await import(
        `@/registry/templates/${dir.name}/_meta`
      );
      index.push({
        name: meta.name,
        type: meta.type,
        categories: meta.categories,
        files: meta.files.map((f) => f.destinationPath), // shadcn index uses the destination paths
      });
    }
  }
  return index;
}

// Builds the JSON for a single static component
export async function getStaticComponent(name: string) {
  const { meta }: { meta: TemplateMetadata } = await import(
    `@/registry/templates/${name}/_meta`
  );

  const componentFiles = await Promise.all(
    meta.files.map(async (file) => {
      const contentPath = path.join(templatesPath, name, file.sourceFileName);
      const content = await fs.readFile(contentPath, "utf-8");
      return {
        // The `name` key in the output should be the filename part of the destination
        name: path.basename(file.destinationPath),
        path: file.destinationPath,
        content: content, // The critical content key
      };
    }),
  );

  return {
    name: meta.name,
    type: meta.type,
    files: componentFiles,
  };
}
```

#### **C. Build-Time Validation (`validator.ts`)**

This script is crucial for preventing regressions. It should be run as part of your CI/CD pipeline or build process.

```typescript
// src/registry/lib/validator.ts
import fs from "fs/promises";
import path from "path";
import { templateMetadataSchema } from "./types";

const templatesPath = path.join(process.cwd(), "src/registry/templates");

async function validateRegistry() {
  console.log("🔍 Validating registry templates...");
  const componentDirs = await fs.readdir(templatesPath, {
    withFileTypes: true,
  });
  let errorCount = 0;

  for (const dir of componentDirs) {
    if (dir.isDirectory()) {
      const metaPath = path.join(templatesPath, dir.name, "_meta.ts");
      const { meta } = await import(metaPath);

      // 1. Validate metadata against Zod schema
      const validationResult = templateMetadataSchema.safeParse(meta);
      if (!validationResult.success) {
        console.error(`❌ Invalid metadata in ${dir.name}/_meta.ts:`);
        console.error(validationResult.error.flatten());
        errorCount++;
      }

      // 2. Validate that all source files exist
      for (const file of meta.files) {
        const sourcePath = path.join(
          templatesPath,
          dir.name,
          file.sourceFileName,
        );
        try {
          await fs.access(sourcePath);
        } catch {
          console.error(
            `❌ Missing source file: ${file.sourceFileName} referenced in ${dir.name}/_meta.ts`,
          );
          errorCount++;
        }
      }
    }
  }

  if (errorCount > 0) {
    console.error(`\nValidation failed with ${errorCount} error(s).`);
    process.exit(1); // Fail the build
  } else {
    console.log("✅ Registry validation successful!");
  }
}

validateRegistry();
```

To run this, add a script to your `package.json`:

```json
{
  "scripts": {
    "build": "npm run registry:validate && next build",
    "registry:validate": "node src/registry/lib/validator.ts"
  }
}
```

### **3. Testing with Vitest**

Your tests should confirm that the API output adheres to the Shadcn spec.

```typescript
// src/app/api/registry/route.test.ts
import { describe, it, expect, vi } from "vitest";
// You will need to mock the `utils.ts` functions to test the API routes in isolation.

vi.mock("@/registry/lib/utils", () => ({
  getRegistryIndex: vi.fn(),
  getStaticComponent: vi.fn(),
}));

describe("Registry API - Phase 1", () => {
  it("GET /api/registry/index.json should return a valid index", async () => {
    // Mock the return value of getRegistryIndex
    // Make a request to the endpoint
    // Assert that the response contains `name`, `type`, `categories`, and `files` (as an array of strings).
  });

  it("GET /api/registry/default/button.json should return a valid component", async () => {
    // Mock the return value of getStaticComponent
    // Make a request to the endpoint
    // Assert that the top-level response has `name`, `type`, and `files`.
    // Assert that each object in the `files` array has `name`, `path`, and `content`.
  });
});
```

This detailed plan for Phase 1 provides a robust, testable, and scalable foundation. By focusing on data integrity and API compatibility first, you set yourself up for success when implementing dynamic components and authentication later.
