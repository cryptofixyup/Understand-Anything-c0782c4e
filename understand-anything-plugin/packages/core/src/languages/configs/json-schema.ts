import type { LanguageConfig } from "../types.js";

export const jsonSchemaConfig: LanguageConfig = {
  id: "json-schema",
  displayName: "JSON Schema",
  extensions: [],
  concepts: ["types", "properties", "required fields", "$ref", "$defs", "allOf/anyOf/oneOf", "patterns", "validation"],
  filePatterns: {
    entryPoints: [],
    barrels: [],
    tests: [],
    config: [],
  },
  detect(filePath: string, content?: string): boolean {
    const lower = filePath.toLowerCase();
    // Filename suffix heuristic: *.schema.json is the dominant convention
    if (lower.endsWith(".schema.json")) return true;
    // Content heuristic: JSON object with a $schema field at the root
    if (content && (lower.endsWith(".json") || lower.endsWith(".yaml") || lower.endsWith(".yml"))) {
      return content.includes('"$schema"') || content.includes("$schema:");
    }
    return false;
  },
};
