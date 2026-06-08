import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { TypeScriptExtractor } from "../typescript-extractor.js";

const require = createRequire(import.meta.url);

let Parser: any;
let Language: any;
let tsLang: any;

beforeAll(async () => {
  const mod = await import("web-tree-sitter");
  Parser = mod.Parser;
  Language = mod.Language;
  await Parser.init();
  const wasmPath = require.resolve(
    "tree-sitter-typescript/tree-sitter-typescript.wasm",
  );
  tsLang = await Language.load(wasmPath);
});

function parse(code: string) {
  const parser = new Parser();
  parser.setLanguage(tsLang);
  const tree = parser.parse(code);
  return { tree, parser, root: tree.rootNode };
}

describe("TypeScriptExtractor", () => {
  const extractor = new TypeScriptExtractor();

  it("has correct languageIds", () => {
    expect(extractor.languageIds).toEqual(["typescript", "javascript"]);
  });

  // ---- Functions ----

  describe("extractStructure - functions", () => {
    it("extracts simple function declarations", () => {
      const { tree, parser, root } = parse(`
function greet(name: string): string {
  return "Hello " + name;
}

function add(a: number, b: number): number {
  return a + b;
}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe("greet");
      expect(result.functions[0].params).toEqual(["name"]);
      expect(result.functions[0].returnType).toBe("string");

      expect(result.functions[1].name).toBe("add");
      expect(result.functions[1].params).toEqual(["a", "b"]);
      expect(result.functions[1].returnType).toBe("number");

      tree.delete();
      parser.delete();
    });

    it("extracts arrow functions assigned to const", () => {
      const { tree, parser, root } = parse(`
const double = (n: number): number => n * 2;
const identity = <T>(x: T): T => x;
`);
      const result = extractor.extractStructure(root);

      expect(result.functions.some((f) => f.name === "double")).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("extracts function expressions assigned to const", () => {
      const { tree, parser, root } = parse(`
const handler = function(req: Request, res: Response): void {
  res.send("ok");
};
`);
      const result = extractor.extractStructure(root);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe("handler");

      tree.delete();
      parser.delete();
    });

    it("extracts rest parameters", () => {
      const { tree, parser, root } = parse(`
function variadic(...args: string[]): void {}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].params).toEqual(["...args"]);

      tree.delete();
      parser.delete();
    });

    it("extracts optional and default parameters", () => {
      const { tree, parser, root } = parse(`
function connect(host: string, port?: number): void {}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].params).toEqual(["host", "port"]);

      tree.delete();
      parser.delete();
    });

    it("reports correct line ranges", () => {
      const { tree, parser, root } = parse(`
function multiLine(
  a: number,
  b: number,
): number {
  return a + b;
}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].lineRange[0]).toBe(2);
      expect(result.functions[0].lineRange[1]).toBe(7);

      tree.delete();
      parser.delete();
    });
  });

  // ---- Classes ----

  describe("extractStructure - classes", () => {
    it("extracts classes with methods and properties", () => {
      const { tree, parser, root } = parse(`
class UserService {
  private name: string;
  readonly id: number;

  constructor(name: string, id: number) {
    this.name = name;
    this.id = id;
  }

  getName(): string {
    return this.name;
  }
}
`);
      const result = extractor.extractStructure(root);

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe("UserService");
      expect(result.classes[0].methods).toContain("constructor");
      expect(result.classes[0].methods).toContain("getName");
      expect(result.classes[0].properties).toContain("name");
      expect(result.classes[0].properties).toContain("id");

      tree.delete();
      parser.delete();
    });

    it("extracts class with multiple methods", () => {
      const { tree, parser, root } = parse(`
class Calculator {
  add(a: number, b: number): number { return a + b; }
  subtract(a: number, b: number): number { return a - b; }
  multiply(a: number, b: number): number { return a * b; }
}
`);
      const result = extractor.extractStructure(root);

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].methods).toContain("add");
      expect(result.classes[0].methods).toContain("subtract");
      expect(result.classes[0].methods).toContain("multiply");

      tree.delete();
      parser.delete();
    });

    it("does not crash on abstract class declarations", () => {
      const { tree, parser, root } = parse(`
abstract class Animal {
  name: string;
  abstract makeSound(): void;
  move(): void {}
}

class Dog extends Animal {
  makeSound(): void {}
}
`);
      // Abstract class nodes are not `class_declaration` in tree-sitter-typescript,
      // so they are not extracted — this is expected and documented behavior.
      // Concrete subclasses are extracted normally.
      expect(() => extractor.extractStructure(root)).not.toThrow();
      const result = extractor.extractStructure(root);
      expect(result.classes.some((c) => c.name === "Dog")).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("extracts class line range", () => {
      const { tree, parser, root } = parse(`
class Simple {
  value: number = 0;
}
`);
      const result = extractor.extractStructure(root);

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].lineRange[0]).toBe(2);
      expect(result.classes[0].lineRange[1]).toBe(4);

      tree.delete();
      parser.delete();
    });

    it("handles empty class body", () => {
      const { tree, parser, root } = parse(`
class Empty {}
`);
      const result = extractor.extractStructure(root);

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe("Empty");
      expect(result.classes[0].methods).toHaveLength(0);
      expect(result.classes[0].properties).toHaveLength(0);

      tree.delete();
      parser.delete();
    });
  });

  // ---- Imports ----

  describe("extractStructure - imports", () => {
    it("extracts named imports", () => {
      const { tree, parser, root } = parse(`
import { readFile, writeFile } from "node:fs";
import { join, resolve } from "node:path";
`);
      const result = extractor.extractStructure(root);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].source).toBe("node:fs");
      expect(result.imports[0].specifiers).toEqual(["readFile", "writeFile"]);
      expect(result.imports[1].source).toBe("node:path");
      expect(result.imports[1].specifiers).toEqual(["join", "resolve"]);

      tree.delete();
      parser.delete();
    });

    it("extracts default imports", () => {
      const { tree, parser, root } = parse(`
import React from "react";
import express from "express";
`);
      const result = extractor.extractStructure(root);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].source).toBe("react");
      expect(result.imports[0].specifiers).toEqual(["React"]);
      expect(result.imports[1].source).toBe("express");

      tree.delete();
      parser.delete();
    });

    it("extracts namespace imports", () => {
      const { tree, parser, root } = parse(`
import * as fs from "node:fs";
`);
      const result = extractor.extractStructure(root);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe("node:fs");
      expect(result.imports[0].specifiers).toEqual(["* as fs"]);

      tree.delete();
      parser.delete();
    });

    it("extracts aliased named imports", () => {
      const { tree, parser, root } = parse(`
import { foo as bar } from "./utils.js";
`);
      const result = extractor.extractStructure(root);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].specifiers).toEqual(["bar"]);

      tree.delete();
      parser.delete();
    });

    it("reports correct import line numbers", () => {
      const { tree, parser, root } = parse(`
import { a } from "./a.js";
import { b } from "./b.js";
`);
      const result = extractor.extractStructure(root);

      expect(result.imports[0].lineNumber).toBe(2);
      expect(result.imports[1].lineNumber).toBe(3);

      tree.delete();
      parser.delete();
    });
  });

  // ---- Exports ----

  describe("extractStructure - exports", () => {
    it("extracts named exported function", () => {
      const { tree, parser, root } = parse(`
export function processData(input: string): string {
  return input.trim();
}
`);
      const result = extractor.extractStructure(root);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].name).toBe("processData");
      expect(result.exports[0].isDefault).toBeFalsy();

      tree.delete();
      parser.delete();
    });

    it("extracts default exported function", () => {
      const { tree, parser, root } = parse(`
export default function handler(): void {}
`);
      const result = extractor.extractStructure(root);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].isDefault).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("extracts exported class", () => {
      const { tree, parser, root } = parse(`
export class ApiClient {
  fetch(): Promise<Response> { return fetch("/api"); }
}
`);
      const result = extractor.extractStructure(root);

      expect(result.exports.some((e) => e.name === "ApiClient")).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("extracts export clause (re-exports)", () => {
      const { tree, parser, root } = parse(`
export { foo, bar as baz };
`);
      const result = extractor.extractStructure(root);

      const exportNames = result.exports.map((e) => e.name);
      expect(exportNames).toContain("foo");
      expect(exportNames).toContain("baz");

      tree.delete();
      parser.delete();
    });

    it("extracts exported const variable", () => {
      const { tree, parser, root } = parse(`
export const MAX_RETRIES = 3;
export const BASE_URL = "https://api.example.com";
`);
      const result = extractor.extractStructure(root);

      const exportNames = result.exports.map((e) => e.name);
      expect(exportNames).toContain("MAX_RETRIES");
      expect(exportNames).toContain("BASE_URL");

      tree.delete();
      parser.delete();
    });

    it("does not duplicate exported function in exports and functions", () => {
      const { tree, parser, root } = parse(`
export function helper(): void {}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions.some((f) => f.name === "helper")).toBe(true);
      expect(result.exports.filter((e) => e.name === "helper")).toHaveLength(1);

      tree.delete();
      parser.delete();
    });
  });

  // ---- Call Graph ----

  describe("extractCallGraph", () => {
    it("extracts simple function calls", () => {
      const { tree, parser, root } = parse(`
function main() {
  const result = compute(42);
  console.log(result);
}
`);
      const result = extractor.extractCallGraph(root);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const callees = result.filter((e) => e.caller === "main").map((e) => e.callee);
      expect(callees).toContain("compute");
      expect(callees).toContain("console.log");

      tree.delete();
      parser.delete();
    });

    it("tracks calls inside arrow function assigned to const", () => {
      const { tree, parser, root } = parse(`
const processAll = (items: string[]) => {
  return items.map(transform);
};
`);
      const result = extractor.extractCallGraph(root);

      const processAllCalls = result.filter((e) => e.caller === "processAll");
      expect(processAllCalls.some((e) => e.callee === "items.map")).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("tracks calls inside class methods", () => {
      const { tree, parser, root } = parse(`
class Service {
  init() {
    this.setup();
    startServer();
  }
}
`);
      const result = extractor.extractCallGraph(root);

      const initCalls = result.filter((e) => e.caller === "init");
      expect(initCalls.some((e) => e.callee === "this.setup")).toBe(true);
      expect(initCalls.some((e) => e.callee === "startServer")).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("reports correct line numbers for calls", () => {
      const { tree, parser, root } = parse(`
function run() {
  foo();
  bar();
}
`);
      const result = extractor.extractCallGraph(root);

      expect(result).toHaveLength(2);
      expect(result[0].lineNumber).toBe(3);
      expect(result[1].lineNumber).toBe(4);

      tree.delete();
      parser.delete();
    });

    it("skips top-level calls outside any function", () => {
      const { tree, parser, root } = parse(`
console.log("top-level");
init();
`);
      const result = extractor.extractCallGraph(root);

      expect(result).toHaveLength(0);

      tree.delete();
      parser.delete();
    });
  });

  // ---- TypeScript-specific ----

  describe("TypeScript-specific constructs", () => {
    it("handles generic function type parameters", () => {
      const { tree, parser, root } = parse(`
function identity<T>(value: T): T {
  return value;
}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe("identity");
      expect(result.functions[0].params).toContain("value");

      tree.delete();
      parser.delete();
    });

    it("handles interface declarations without crashing", () => {
      const { tree, parser, root } = parse(`
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  return { id, name: "Alice" };
}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions.some((f) => f.name === "getUser")).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("handles enum declarations without crashing", () => {
      const { tree, parser, root } = parse(`
enum Direction { Up, Down, Left, Right }

function move(dir: Direction): void {}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions.some((f) => f.name === "move")).toBe(true);

      tree.delete();
      parser.delete();
    });

    it("handles type alias declarations without crashing", () => {
      const { tree, parser, root } = parse(`
type Callback = (err: Error | null, result: string) => void;

function run(cb: Callback): void {
  cb(null, "done");
}
`);
      const result = extractor.extractStructure(root);

      expect(result.functions.some((f) => f.name === "run")).toBe(true);

      tree.delete();
      parser.delete();
    });
  });

  // ---- Comprehensive ----

  describe("realistic TypeScript module", () => {
    it("handles a full module with imports, exports, classes, and functions", () => {
      const { tree, parser, root } = parse(`
import { EventEmitter } from "node:events";
import type { Logger } from "./logger.js";

export interface Config {
  host: string;
  port: number;
}

export class Server extends EventEmitter {
  private config: Config;
  running: boolean;

  constructor(config: Config) {
    super();
    this.config = config;
    this.running = false;
  }

  start(): void {
    this.running = true;
    this.emit("start");
  }

  stop(): void {
    this.running = false;
    this.emit("stop");
  }
}

export function createServer(config: Config): Server {
  return new Server(config);
}

export const DEFAULT_CONFIG: Config = { host: "localhost", port: 3000 };
`);
      const result = extractor.extractStructure(root);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].source).toBe("node:events");

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe("Server");
      expect(result.classes[0].methods).toContain("constructor");
      expect(result.classes[0].methods).toContain("start");
      expect(result.classes[0].methods).toContain("stop");
      expect(result.classes[0].properties).toContain("config");
      expect(result.classes[0].properties).toContain("running");

      expect(result.functions.some((f) => f.name === "createServer")).toBe(true);

      const exportNames = result.exports.map((e) => e.name);
      expect(exportNames).toContain("createServer");
      expect(exportNames).toContain("DEFAULT_CONFIG");

      tree.delete();
      parser.delete();
    });
  });
});
