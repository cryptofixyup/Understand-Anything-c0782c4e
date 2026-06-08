import { describe, it, expect } from "vitest";
import { builtinLanguageConfigs } from "../configs/index.js";
import { builtinFrameworkConfigs } from "../frameworks/index.js";
import { LanguageConfigSchema, FrameworkConfigSchema } from "../types.js";

describe("builtinLanguageConfigs", () => {
  it("every config passes the LanguageConfig schema", () => {
    const failures: string[] = [];

    for (const config of builtinLanguageConfigs) {
      const result = LanguageConfigSchema.safeParse(config);
      if (!result.success) {
        failures.push(
          `${config.id ?? "(unknown)"}: ${result.error.issues.map((i) => i.message).join(", ")}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it("every config has a non-empty id and displayName", () => {
    for (const config of builtinLanguageConfigs) {
      expect(config.id.length).toBeGreaterThan(0);
      expect(config.displayName.length).toBeGreaterThan(0);
    }
  });

  it("no two configs share the same id", () => {
    const ids = builtinLanguageConfigs.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("no two configs share the same file extension across all configs", () => {
    const seen = new Map<string, string>();
    const conflicts: string[] = [];

    for (const config of builtinLanguageConfigs) {
      for (const ext of config.extensions) {
        if (seen.has(ext)) {
          conflicts.push(`"${ext}" claimed by both "${seen.get(ext)}" and "${config.id}"`);
        } else {
          seen.set(ext, config.id);
        }
      }
    }

    expect(conflicts).toEqual([]);
  });

  it("every extension starts with a dot", () => {
    const bad: string[] = [];
    for (const config of builtinLanguageConfigs) {
      for (const ext of config.extensions) {
        if (!ext.startsWith(".")) {
          bad.push(`${config.id}: "${ext}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("every config with treeSitter has both wasmPackage and wasmFile", () => {
    for (const config of builtinLanguageConfigs) {
      if (config.treeSitter) {
        expect(config.treeSitter.wasmPackage.length).toBeGreaterThan(0);
        expect(config.treeSitter.wasmFile.length).toBeGreaterThan(0);
        expect(config.treeSitter.wasmFile).toMatch(/\.wasm$/);
      }
    }
  });

  it("every config has the four required filePattern arrays", () => {
    for (const config of builtinLanguageConfigs) {
      expect(Array.isArray(config.filePatterns.entryPoints)).toBe(true);
      expect(Array.isArray(config.filePatterns.barrels)).toBe(true);
      expect(Array.isArray(config.filePatterns.tests)).toBe(true);
      expect(Array.isArray(config.filePatterns.config)).toBe(true);
    }
  });

  it("covers all 40 builtin language configs", () => {
    // Regression guard: catches accidental removals from the builtinLanguageConfigs array
    expect(builtinLanguageConfigs.length).toBeGreaterThanOrEqual(40);
  });
});

describe("builtinFrameworkConfigs", () => {
  it("every config passes the FrameworkConfig schema", () => {
    const failures: string[] = [];

    for (const config of builtinFrameworkConfigs) {
      const result = FrameworkConfigSchema.safeParse(config);
      if (!result.success) {
        failures.push(
          `${config.id ?? "(unknown)"}: ${result.error.issues.map((i) => i.message).join(", ")}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it("every config has a non-empty id and displayName", () => {
    for (const config of builtinFrameworkConfigs) {
      expect(config.id.length).toBeGreaterThan(0);
      expect(config.displayName.length).toBeGreaterThan(0);
    }
  });

  it("no two configs share the same id", () => {
    const ids = builtinFrameworkConfigs.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every config has at least one detection keyword", () => {
    for (const config of builtinFrameworkConfigs) {
      expect(config.detectionKeywords.length).toBeGreaterThan(0);
    }
  });

  it("every config has at least one manifest file", () => {
    for (const config of builtinFrameworkConfigs) {
      expect(config.manifestFiles.length).toBeGreaterThan(0);
    }
  });

  it("every config has at least one associated language", () => {
    for (const config of builtinFrameworkConfigs) {
      expect(config.languages.length).toBeGreaterThan(0);
    }
  });

  it("every config has a non-empty promptSnippetPath", () => {
    for (const config of builtinFrameworkConfigs) {
      expect(config.promptSnippetPath.length).toBeGreaterThan(0);
    }
  });

  it("covers all 10 builtin framework configs", () => {
    expect(builtinFrameworkConfigs.length).toBeGreaterThanOrEqual(10);
  });
});
