import { describe, it, expect } from "vitest";
import { detectCommunities } from "../louvain.js";
import type { GraphEdge } from "@understand-anything/core/types";

function edge(source: string, target: string): GraphEdge {
  return { source, target, type: "imports", direction: "forward", weight: 1 };
}

describe("detectCommunities", () => {
  it("returns an empty map for an empty node list", () => {
    const result = detectCommunities([], []);
    expect(result.size).toBe(0);
  });

  it("assigns a community id to every node", () => {
    const nodes = ["a", "b", "c", "d"];
    const edges = [edge("a", "b"), edge("c", "d")];
    const result = detectCommunities(nodes, edges);

    expect(result.size).toBe(4);
    for (const id of nodes) {
      expect(result.has(id)).toBe(true);
      expect(typeof result.get(id)).toBe("number");
    }
  });

  it("puts a single isolated node in its own community", () => {
    const result = detectCommunities(["solo"], []);
    expect(result.size).toBe(1);
    expect(typeof result.get("solo")).toBe("number");
  });

  it("all community ids are non-negative integers", () => {
    const nodes = ["a", "b", "c", "d", "e"];
    const edges = [edge("a", "b"), edge("b", "c"), edge("d", "e")];
    const result = detectCommunities(nodes, edges);

    for (const [, community] of result) {
      expect(community).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(community)).toBe(true);
    }
  });

  it("two clearly separate cliques land in different communities", () => {
    // Clique 1: a–b–c fully connected
    // Clique 2: x–y–z fully connected
    // No edges between cliques
    const nodes = ["a", "b", "c", "x", "y", "z"];
    const edges = [
      edge("a", "b"), edge("b", "c"), edge("a", "c"),
      edge("x", "y"), edge("y", "z"), edge("x", "z"),
    ];
    const result = detectCommunities(nodes, edges);

    const communityA = result.get("a")!;
    const communityX = result.get("x")!;
    expect(communityA).not.toBe(communityX);

    // All members of each clique share the same community
    expect(result.get("b")).toBe(communityA);
    expect(result.get("c")).toBe(communityA);
    expect(result.get("y")).toBe(communityX);
    expect(result.get("z")).toBe(communityX);
  });

  it("ignores edges whose endpoints are not in the node list", () => {
    const nodes = ["a", "b"];
    const edges = [
      edge("a", "b"),
      edge("a", "ghost"),    // "ghost" is not in nodeIds
      edge("phantom", "b"),  // "phantom" is not in nodeIds
    ];

    expect(() => detectCommunities(nodes, edges)).not.toThrow();

    const result = detectCommunities(nodes, edges);
    expect(result.size).toBe(2);
  });

  it("ignores self-loop edges", () => {
    const nodes = ["a", "b"];
    const edges = [edge("a", "a"), edge("b", "b"), edge("a", "b")];

    expect(() => detectCommunities(nodes, edges)).not.toThrow();

    const result = detectCommunities(nodes, edges);
    expect(result.size).toBe(2);
  });

  it("ignores duplicate edges (same source/target pair)", () => {
    const nodes = ["a", "b"];
    const edges = [edge("a", "b"), edge("a", "b"), edge("a", "b")];

    expect(() => detectCommunities(nodes, edges)).not.toThrow();

    const result = detectCommunities(nodes, edges);
    expect(result.size).toBe(2);
  });

  it("multiple disconnected nodes each get unique community ids", () => {
    const nodes = ["n1", "n2", "n3", "n4"];
    const result = detectCommunities(nodes, []);

    const communities = nodes.map((n) => result.get(n)!);
    const unique = new Set(communities);
    expect(unique.size).toBe(4);
  });

  it("is deterministic across multiple runs with the same input", () => {
    const nodes = ["a", "b", "c", "d", "e"];
    const edges = [edge("a", "b"), edge("b", "c"), edge("d", "e")];

    const result1 = detectCommunities(nodes, edges);
    const result2 = detectCommunities(nodes, edges);

    for (const id of nodes) {
      expect(result1.get(id)).toBe(result2.get(id));
    }
  });

  it("returns the same community id for two directly connected nodes in a small graph", () => {
    const nodes = ["a", "b"];
    const edges = [edge("a", "b")];
    const result = detectCommunities(nodes, edges);

    expect(result.get("a")).toBe(result.get("b"));
  });
});
