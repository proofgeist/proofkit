import { describe, it, expect } from "vitest";
import { getRegistryIndex, getStaticComponent } from "@/registry/lib/utils";
import { RegistryItem } from "@/registry/lib/types";

describe("Registry utils (dynamic scanning)", () => {
  it("reads index dynamically", async () => {
    const index = await getRegistryIndex();
    expect(Array.isArray(index)).toBe(true);
    // Should find the mode-toggle template
    expect(index.length).toBeGreaterThan(0);
    expect(index[0]).toHaveProperty("name");
    expect(index[0]).toHaveProperty("type");
    expect(index[0]).toHaveProperty("categories");
    expect(index[0]).toHaveProperty("files");
  });

  it("reads a known template (mode-toggle)", async () => {
    const comp = await getStaticComponent("mode-toggle");
    expect(comp).toHaveProperty("files");
    expect(comp.files).toBeInstanceOf(Array);
    expect(comp.files.length).toBeGreaterThan(0);
  });

  it("throws error for non-existent template", async () => {
    await expect(getStaticComponent("non-existent")).rejects.toThrow(
      'Template "non-existent" not found',
    );
  });

  it("passes type check", async () => {
    // this test doesn't return anything, but it should not throw any TypeScript errors
    const test1: RegistryItem = {
      name: "test",
      type: "registry:component",
      files: [
        {
          type: "registry:block",
          path: "test.tsx",
          content: "test",
          target: "~/test.tsx",
        },
      ],
    };

    const test2: RegistryItem = {
      name: "test",
      type: "registry:component",
      files: [
        // @ts-expect-error - content is missing
        {
          type: "registry:block",
          path: "test.tsx",
          target: "~/test.tsx",
        },
      ],
    };

    // @ts-expect-error - files is missing
    const test3: RegistryItem = {
      name: "test",
      type: "registry:component",
    };
  });
});
