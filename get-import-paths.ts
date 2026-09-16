#!/usr/bin/env bun
import { resolve } from "node:path";
import { buildGraph } from "./core.ts";

const entryPoint = process.argv[2];
const target = process.argv[3];
if (!entryPoint || !target || typeof Bun === "undefined") {
  console.log(
    "Usage: bun get-import-paths <entryPoint> <target> [--skip-dynamic-imports]",
  );
  process.exit(1);
}

const skipDynamicImports = process.argv.includes("--skip-dynamic-imports");

const absoluteEntryPoint = resolve(entryPoint);
const absoluteTarget = resolve(target);

const graph = buildGraph(absoluteEntryPoint, { skipDynamicImports });

const seen = new Set<string>();

export const canReach = (from: string, target: string): boolean => {
  if (from === target) return true;
  const imports = graph.get(from);
  if (!imports) return false;
  for (const imp of imports) {
    if (canReach(imp, target)) return true;
  }
  return false;
};

const searchForPaths = (path: string, currentPath: string[]) => {
  if (seen.has(path)) return;
  seen.add(path);
  const imports = graph.get(path);
  if (!imports) return;
  for (const imp of imports) {
    if (imp === absoluteTarget) {
      console.log(
        [
          `Path found:`,
          `  ${absoluteEntryPoint}`,
          ...[...currentPath, absoluteTarget].slice(1).map((f) => `  -> ${f}`),
        ].join("\n"),
      );
    }
    searchForPaths(imp, [...currentPath, imp]);
  }
};

searchForPaths(absoluteEntryPoint, []);
