import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateTemplateMetadata,
  isValidRegistryTemplate,
  type ValidationContext,
} from "./validator.js";
import fs from "fs";
import path from "path";

// Mock fs module
vi.mock("fs");
const mockedFs = vi.mocked(fs);

describe("validator", () => {
  let mockContext: ValidationContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      templatesPath: "/mock/templates",
      templateName: "test-template",
      templateDir: "/mock/templates/test-template",
    };
  });

  describe("isValidRegistryTemplate", () => {
    it("should return true when template meta file exists", () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = isValidRegistryTemplate(
        "email/generic",
        "/mock/templates",
      );

      expect(result).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        "/mock/templates/email/generic/_meta.ts",
      );
    });

    it("should return false when template meta file does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = isValidRegistryTemplate("nonexistent", "/mock/templates");

      expect(result).toBe(false);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        "/mock/templates/nonexistent/_meta.ts",
      );
    });
  });

  describe("validateTemplateMetadata", () => {
    beforeEach(() => {
      // Mock readdir to return empty files by default
      mockedFs.readdirSync.mockReturnValue([] as any);
    });

    it("should validate a basic valid template", () => {
      const validMeta = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [],
      };

      expect(() =>
        validateTemplateMetadata(validMeta, mockContext),
      ).not.toThrow();
    });

    it("should throw error for invalid metadata structure", () => {
      const invalidMeta = {
        type: "invalid-type",
        title: "Test",
      };

      expect(() => validateTemplateMetadata(invalidMeta, mockContext)).toThrow(
        /Invalid metadata structure/,
      );
    });

    it("should throw error for missing required fields", () => {
      const incompleteMeta = {
        type: "static",
        title: "Test",
        // missing description, category, registryType
      };

      expect(() =>
        validateTemplateMetadata(incompleteMeta, mockContext),
      ).toThrow(/Invalid metadata structure/);
    });

    it("should validate files exist when declared", () => {
      const metaWithFiles = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [
          {
            sourceFileName: "component.tsx",
            destinationPath: "components/component.tsx",
            type: "registry:component",
          },
        ],
      };

      // Mock that the file exists (existsSync is used for file check)
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        "component.tsx",
        "_meta.ts",
      ] as any);

      expect(() =>
        validateTemplateMetadata(metaWithFiles, mockContext),
      ).not.toThrow();
    });

    it("should throw error when declared file does not exist", () => {
      const metaWithMissingFile = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [
          {
            sourceFileName: "missing.tsx",
            destinationPath: "components/missing.tsx",
            type: "registry:component",
          },
        ],
      };

      // Mock that the file doesn't exist (existsSync returns false for the file)
      mockedFs.existsSync.mockReturnValue(false);
      // Mock readdirSync to return the _meta.ts and some other files (so it passes "has content" check)
      mockedFs.readdirSync.mockReturnValue(["_meta.ts", "other-file.ts"] as any);

      expect(() =>
        validateTemplateMetadata(metaWithMissingFile, mockContext),
      ).toThrow(/Declared file 'missing.tsx' does not exist/);
    });

    it("should throw error when declared file does not exist (caught first)", () => {
      const metaWithFiles = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [
          {
            sourceFileName: "component.tsx",
            destinationPath: "components/component.tsx",
            type: "registry:component",
          },
        ],
      };

      // Mock that the file doesn't exist (existsSync returns false for the file)
      mockedFs.existsSync.mockReturnValue(false);
      // Mock readdirSync to return _meta.ts and some other files (so it passes "has content" check)
      mockedFs.readdirSync.mockReturnValue(["_meta.ts", "other-file.ts"] as any);

      expect(() =>
        validateTemplateMetadata(metaWithFiles, mockContext),
      ).toThrow(/Declared file 'component.tsx' does not exist/);
    });

    it("should allow templates with no files (dependency-only templates)", () => {
      const dependencyOnlyMeta = {
        type: "static",
        title: "Dependency Template",
        description: "A template that only adds dependencies",
        category: "utility",
        registryType: "registry:lib",
        files: [],
        dependencies: ["react", "react-dom"],
      };

      // Mock empty directory
      mockedFs.readdirSync.mockReturnValue(["_meta.ts"] as any);

      expect(() =>
        validateTemplateMetadata(dependencyOnlyMeta, mockContext),
      ).not.toThrow();
    });

    it("should validate proofkitDependencies exist", () => {
      const metaWithProofkitDeps = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [],
        proofkitDependencies: ["react-email"],
      };

      // Mock that react-email template exists
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === "/mock/templates/react-email/_meta.ts";
      });

      expect(() =>
        validateTemplateMetadata(metaWithProofkitDeps, mockContext),
      ).not.toThrow();
    });

    it("should throw error for invalid proofkitDependencies", () => {
      const metaWithInvalidDeps = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [],
        registryDependencies: ["{proofkit}/r/nonexistent-template"],
      };

      // Mock that template doesn't exist
      mockedFs.existsSync.mockReturnValue(false);

      expect(() =>
        validateTemplateMetadata(metaWithInvalidDeps, mockContext),
      ).toThrow(
        /Invalid registryDependencies reference '{proofkit}\/r\/nonexistent-template'/,
      );
    });

    it("should validate proofkit registryDependencies", () => {
      const metaWithRegistryDeps = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [],
        registryDependencies: [
          "{proofkit}/r/email/generic",
          "external-component", // non-proofkit, should be ignored
        ],
      };

      // Mock that email/generic template exists
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === "/mock/templates/email/generic/_meta.ts";
      });

      expect(() =>
        validateTemplateMetadata(metaWithRegistryDeps, mockContext),
      ).not.toThrow();
    });

    it("should throw error for invalid proofkit registryDependencies", () => {
      const metaWithInvalidRegistryDeps = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [],
        registryDependencies: ["{proofkit}/r/email/nonexistent"],
      };

      // Mock that template doesn't exist
      mockedFs.existsSync.mockReturnValue(false);

      expect(() =>
        validateTemplateMetadata(metaWithInvalidRegistryDeps, mockContext),
      ).toThrow(
        /Invalid registryDependencies reference '{proofkit}\/r\/email\/nonexistent'/,
      );
    });

    it("should ignore non-proofkit registryDependencies", () => {
      const metaWithMixedDeps = {
        type: "static",
        title: "Test Template",
        description: "A test template",
        category: "utility",
        registryType: "registry:lib",
        files: [],
        registryDependencies: [
          "shadcn/ui/button", // external, should be ignored
          "some-other-registry/component", // external, should be ignored
        ],
      };

      expect(() =>
        validateTemplateMetadata(metaWithMixedDeps, mockContext),
      ).not.toThrow();
    });

    it("should validate dynamic templates", () => {
      const dynamicMeta = {
        type: "dynamic",
        title: "Dynamic Template",
        description: "A dynamic template",
        category: "component",
        registryType: "registry:component",
        files: [],
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      };

      expect(() =>
        validateTemplateMetadata(dynamicMeta, mockContext),
      ).not.toThrow();
    });

    it("should validate all category types", () => {
      const categories = ["component", "page", "utility", "hook", "email"];

      categories.forEach((category) => {
        const meta = {
          type: "static",
          title: "Test Template",
          description: "A test template",
          category,
          registryType: "registry:lib",
          files: [],
        };

        expect(() => validateTemplateMetadata(meta, mockContext)).not.toThrow();
      });
    });

    it("should validate all registryType values", () => {
      const registryTypes = [
        "registry:lib",
        "registry:component",
        "registry:hook",
        "registry:ui",
        "registry:file",
        "registry:page",
      ];

      registryTypes.forEach((registryType) => {
        const meta = {
          type: "static",
          title: "Test Template",
          description: "A test template",
          category: "utility",
          registryType,
          files: [],
        };

        expect(() => validateTemplateMetadata(meta, mockContext)).not.toThrow();
      });
    });
  });
});
