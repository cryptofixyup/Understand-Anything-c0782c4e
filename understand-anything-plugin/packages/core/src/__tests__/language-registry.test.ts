import { describe, it, expect } from "vitest";
import { LanguageRegistry } from "../languages/language-registry.js";
import { StrictLanguageConfigSchema } from "../languages/types.js";
import { typescriptConfig } from "../languages/configs/typescript.js";
import { pythonConfig } from "../languages/configs/python.js";

describe("LanguageRegistry", () => {
  it("registers and retrieves a language config by id", () => {
    const registry = new LanguageRegistry();
    registry.register(typescriptConfig);
    expect(registry.getById("typescript")).toEqual(typescriptConfig);
  });

  it("retrieves config by file extension", () => {
    const registry = new LanguageRegistry();
    registry.register(typescriptConfig);
    expect(registry.getByExtension(".ts")?.id).toBe("typescript");
    expect(registry.getByExtension(".tsx")?.id).toBe("typescript");
  });

  it("retrieves config for a file path", () => {
    const registry = new LanguageRegistry();
    registry.register(typescriptConfig);
    registry.register(pythonConfig);
    expect(registry.getForFile("src/index.ts")?.id).toBe("typescript");
    expect(registry.getForFile("app/models.py")?.id).toBe("python");
  });

  it("returns null for unknown extensions", () => {
    const registry = new LanguageRegistry();
    registry.register(typescriptConfig);
    expect(registry.getByExtension(".xyz")).toBeNull();
    expect(registry.getForFile("file.unknown")).toBeNull();
  });

  it("returns null for files without extensions and no filename match", () => {
    const registry = new LanguageRegistry();
    expect(registry.getForFile("SOMEFILE")).toBeNull();
  });

  it("lists all registered languages", () => {
    const registry = new LanguageRegistry();
    registry.register(typescriptConfig);
    registry.register(pythonConfig);
    const all = registry.getAllLanguages();
    expect(all).toHaveLength(2);
    expect(all.map(c => c.id)).toContain("typescript");
    expect(all.map(c => c.id)).toContain("python");
  });

  describe("createDefault", () => {
    it("registers all 40 built-in language configs", () => {
      const registry = LanguageRegistry.createDefault();
      const all = registry.getAllLanguages();
      expect(all.length).toBe(40);
    });

    it("maps all expected extensions", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getByExtension(".ts")?.id).toBe("typescript");
      expect(registry.getByExtension(".py")?.id).toBe("python");
      expect(registry.getByExtension(".go")?.id).toBe("go");
      expect(registry.getByExtension(".rs")?.id).toBe("rust");
      expect(registry.getByExtension(".java")?.id).toBe("java");
      expect(registry.getByExtension(".rb")?.id).toBe("ruby");
      expect(registry.getByExtension(".php")?.id).toBe("php");
      expect(registry.getByExtension(".swift")?.id).toBe("swift");
      expect(registry.getByExtension(".kt")?.id).toBe("kotlin");
      expect(registry.getByExtension(".cs")?.id).toBe("csharp");
      expect(registry.getByExtension(".cpp")?.id).toBe("cpp");
      expect(registry.getByExtension(".c")?.id).toBe("c");
      expect(registry.getByExtension(".h")?.id).toBe("c");
      expect(registry.getByExtension(".lua")?.id).toBe("lua");
      expect(registry.getByExtension(".js")?.id).toBe("javascript");
    });

    it("has no duplicate extension mappings across configs", () => {
      const registry = LanguageRegistry.createDefault();
      const all = registry.getAllLanguages();
      const allExtensions: string[] = [];
      for (const config of all) {
        allExtensions.push(...config.extensions);
      }
      const unique = new Set(allExtensions);
      expect(unique.size).toBe(allExtensions.length);
    });

    it("every config has at least one concept", () => {
      const registry = LanguageRegistry.createDefault();
      for (const config of registry.getAllLanguages()) {
        expect(config.concepts.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Non-code language configs", () => {
    it("detects all non-code file types via extension", () => {
      const registry = LanguageRegistry.createDefault();
      const expectations: [string, string][] = [
        ["README.md", "markdown"],
        ["config.yaml", "yaml"],
        ["package.json", "json"],
        ["config.toml", "toml"],
        [".env", "env"],
        ["pom.xml", "xml"],
        ["Dockerfile", "dockerfile"],
        ["schema.sql", "sql"],
        ["schema.graphql", "graphql"],
        ["types.proto", "protobuf"],
        ["main.tf", "terraform"],
        ["Makefile", "makefile"],
        ["deploy.sh", "shell"],
        ["index.html", "html"],
        ["styles.css", "css"],
        ["data.csv", "csv"],
        ["deploy.ps1", "powershell"],
      ];
      for (const [file, expectedId] of expectations) {
        const config = registry.getForFile(file);
        expect(config?.id, `${file} should be detected as ${expectedId}`).toBe(expectedId);
      }
    });

    it("detects filename-based configs (Dockerfile, Makefile, Jenkinsfile)", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFile("Dockerfile")?.id).toBe("dockerfile");
      expect(registry.getForFile("Makefile")?.id).toBe("makefile");
      expect(registry.getForFile("Jenkinsfile")?.id).toBe("jenkinsfile");
      expect(registry.getForFile("src/Dockerfile")?.id).toBe("dockerfile");
      expect(registry.getForFile("build/Makefile")?.id).toBe("makefile");
    });

    it("detects filename-based configs for docker-compose", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFile("docker-compose.yml")?.id).toBe("docker-compose");
      expect(registry.getForFile("docker-compose.yaml")?.id).toBe("docker-compose");
      expect(registry.getForFile("compose.yml")?.id).toBe("docker-compose");
    });

    it("detects .env file variants", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFile(".env")?.id).toBe("env");
      expect(registry.getForFile(".env.local")?.id).toBe("env");
      expect(registry.getForFile(".env.production")?.id).toBe("env");
    });
  });

  describe("content-based detection via getForFileWithContent", () => {
    it("detects Kubernetes manifests by path pattern", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFileWithContent("infra/k8s/deployment.yaml")?.id).toBe("kubernetes");
      expect(registry.getForFileWithContent("project/kubernetes/service.yml")?.id).toBe("kubernetes");
      expect(registry.getForFileWithContent("helm/charts/ingress.yaml")?.id).toBe("kubernetes");
    });

    it("detects Kubernetes manifests by content when path is ambiguous", () => {
      const registry = LanguageRegistry.createDefault();
      const k8sContent = "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\n";
      expect(registry.getForFileWithContent("config/app.yaml", k8sContent)?.id).toBe("kubernetes");
    });

    it("does not detect Kubernetes for non-YAML files", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFileWithContent("k8s/config.json")?.id).not.toBe("kubernetes");
    });

    it("detects JSON Schema by .schema.json suffix", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFileWithContent("schemas/user.schema.json")?.id).toBe("json-schema");
      expect(registry.getForFileWithContent("types/api.schema.json")?.id).toBe("json-schema");
    });

    it("detects JSON Schema by $schema field in content", () => {
      const registry = LanguageRegistry.createDefault();
      const jsonSchemaContent = '{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object"\n}';
      expect(registry.getForFileWithContent("config/options.json", jsonSchemaContent)?.id).toBe("json-schema");
    });

    it("falls back to extension match when no detector fires", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFileWithContent("src/index.ts")?.id).toBe("typescript");
      expect(registry.getForFileWithContent("config.yaml")?.id).toBe("yaml");
    });

    it("getForFileWithContent returns null for unknown files", () => {
      const registry = LanguageRegistry.createDefault();
      expect(registry.getForFileWithContent("file.unknownext")).toBeNull();
    });

    it("detector stored separately does not affect getForFile", () => {
      const registry = LanguageRegistry.createDefault();
      // getForFile uses only extension/filename, not detectors
      expect(registry.getForFile("k8s/deployment.yaml")?.id).toBe("yaml");
      expect(registry.getForFile("user.schema.json")?.id).toBe("json");
    });
  });

  describe("StrictLanguageConfigSchema refinement", () => {
    it("rejects configs with empty extensions AND no filenames", () => {
      const result = StrictLanguageConfigSchema.safeParse({
        id: "empty-lang",
        displayName: "Empty",
        extensions: [],
        concepts: ["nothing"],
        filePatterns: { entryPoints: [], barrels: [], tests: [], config: [] },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least one extension or filename");
      }
    });

    it("rejects configs with empty extensions AND empty filenames", () => {
      const result = StrictLanguageConfigSchema.safeParse({
        id: "empty-lang",
        displayName: "Empty",
        extensions: [],
        filenames: [],
        concepts: ["nothing"],
        filePatterns: { entryPoints: [], barrels: [], tests: [], config: [] },
      });
      expect(result.success).toBe(false);
    });

    it("accepts configs with extensions but no filenames", () => {
      const result = StrictLanguageConfigSchema.safeParse({
        id: "ext-lang",
        displayName: "ExtLang",
        extensions: [".ext"],
        concepts: ["something"],
        filePatterns: { entryPoints: [], barrels: [], tests: [], config: [] },
      });
      expect(result.success).toBe(true);
    });

    it("accepts configs with filenames but empty extensions", () => {
      const result = StrictLanguageConfigSchema.safeParse({
        id: "filename-lang",
        displayName: "FilenameLang",
        extensions: [],
        filenames: ["Specialfile"],
        concepts: ["something"],
        filePatterns: { entryPoints: [], barrels: [], tests: [], config: [] },
      });
      expect(result.success).toBe(true);
    });
  });
});
