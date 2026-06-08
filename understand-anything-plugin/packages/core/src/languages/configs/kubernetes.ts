import type { LanguageConfig } from "../types.js";

const K8S_DIRS = ["/k8s/", "/kubernetes/", "/deploy/", "/charts/", "/helm/", "/manifests/"];
const K8S_CONTENT_MARKERS = ["apiVersion:", "kind:"];

export const kubernetesConfig: LanguageConfig = {
  id: "kubernetes",
  displayName: "Kubernetes",
  extensions: [],
  concepts: ["deployments", "services", "pods", "configmaps", "secrets", "ingress", "volumes", "namespaces"],
  filePatterns: {
    entryPoints: [],
    barrels: [],
    tests: [],
    config: ["k8s/*.yaml", "kubernetes/*.yaml"],
  },
  detect(filePath: string, content?: string): boolean {
    const lower = filePath.toLowerCase();
    const hasYamlExt = lower.endsWith(".yaml") || lower.endsWith(".yml");
    if (!hasYamlExt) return false;
    // Path-pattern heuristic: file lives under a well-known k8s directory
    const normalized = lower.replaceAll("\\", "/");
    if (K8S_DIRS.some((dir) => normalized.includes(dir))) return true;
    // Content heuristic: YAML contains both apiVersion and kind fields
    if (content) {
      return K8S_CONTENT_MARKERS.every((marker) => content.includes(marker));
    }
    return false;
  },
};
