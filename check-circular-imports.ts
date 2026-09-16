#!/usr/bin/env bun
import { resolve } from "node:path";
import { buildGraph, canReach, buildPath } from "./core.ts";

const entryPoint = process.argv[2];
if (!entryPoint || typeof Bun === "undefined") {
  console.log("Usage: bun check-circular-imports <entryPoint>");
  process.exit(1);
}

const absoluteEntryPoint = resolve(entryPoint);
const graph = buildGraph(absoluteEntryPoint);

const checkCircularImports = (path: string) => {
  const imports = graph.get(path);
  if (!imports) return;
  for (const imp of imports) {
    if (canReach(imp, path)) {
      const files = buildPath(imp, path)!;
      console.log(
        [
          `Circular import detected:`,
          `  ${path}`,
          ...files.map((f) => `  -> ${f}`),
        ].join("\n"),
      );
      process.exit(1);
    }
  }
};

checkCircularImports(absoluteEntryPoint);
