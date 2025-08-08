import { describe, it, expect, vi, beforeEach } from "vitest";
import * as utils from "@proofkit/registry";
import { GET as registryRoute } from "@/app/r/[[...name]]/route";

vi.mock("@proofkit/registry", async () => {
  const actual = await vi.importActual<typeof utils>("@proofkit/registry");
  return {
    ...actual,
    getRegistryIndex: vi.fn(),
    getStaticComponent: vi.fn(),
  };
});

describe("Registry API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /registry/index.json returns index", async () => {
    (utils.getRegistryIndex as unknown as jest.Mock)?.mockResolvedValue?.([
      {
        name: "button",
        type: "static",
        categories: ["component"],
        files: ["src/components/ui/button.tsx"],
      },
    ]);

    const res = await registryRoute(
      new Request("http://localhost/r/index.json"),
    );

    const json = await (res as Response).json();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toMatchObject({ name: "button", type: "static" });
  });

  it("GET /registry returns index (no segments)", async () => {
    (utils.getRegistryIndex as unknown as jest.Mock)?.mockResolvedValue?.([
      { name: "button", type: "static", categories: ["component"], files: [] },
    ]);

    const res = await registryRoute(new Request("http://localhost/r"));

    const json = await (res as Response).json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("GET /registry/button.json returns a component", async () => {
    (utils.getStaticComponent as unknown as jest.Mock)?.mockResolvedValue?.({
      name: "button",
      type: "static",
      files: [
        {
          name: "button.tsx",
          path: "src/components/ui/button.tsx",
          content: "export const x = 1;",
        },
      ],
    });

    const res = await registryRoute(
      new Request("http://localhost/r/button.json"),
    );
    const json = await (res as Response).json();
    expect(json).toMatchObject({ name: "button", type: "static" });
    expect(Array.isArray(json.files)).toBe(true);
    expect(json.files[0]).toHaveProperty("content");
  });

  it("GET /registry/button returns a component (no .json)", async () => {
    (utils.getStaticComponent as unknown as jest.Mock)?.mockResolvedValue?.({
      name: "button",
      type: "static",
      files: [
        {
          name: "button.tsx",
          path: "src/components/ui/button.tsx",
          content: "export const x = 1;",
        },
      ],
    });

    const res = await registryRoute(new Request("http://localhost/r/button"));
    const json = await (res as Response).json();
    expect(json).toMatchObject({ name: "button", type: "static" });
  });
});
