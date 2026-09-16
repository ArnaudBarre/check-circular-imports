#!/usr/bin/env bun
import { resolve } from "node:path";
import { buildGraph } from "./core.ts";

const entryPoint = process.argv[2];
if (!entryPoint || typeof Bun === "undefined") {
  console.log("Usage: bun check-circular-imports <entryPoint>");
  process.exit(1);
}

const absoluteEntryPoint = resolve(entryPoint);

const canReach = (
  graph: Map<string, string[]>,
  from: string,
  target: string,
): boolean => {
  if (from === target) return true;
  const imports = graph.get(from);
  if (!imports) return false;
  for (const imp of imports) {
    if (canReach(graph, imp, target)) return true;
  }
  return false;
};

const buildErrorMessage = (
  graph: Map<string, string[]>,
  message: string,
  from: string,
  target: string,
): string | false => {
  if (from === target) return message;
  const imports = graph.get(from);
  if (!imports) return false;
  for (const imp of imports) {
    const fullMessage = buildErrorMessage(
      graph,
      `${message} -> ${imp}`,
      imp,
      target,
    );
    if (fullMessage) return fullMessage;
  }
  return false;
};

buildGraph(absoluteEntryPoint, {
  onNewNode: ({ path, imports, graph }) => {
    for (const imp of imports) {
      if (canReach(graph, imp, path)) {
        const fullMessage = buildErrorMessage(
          graph,
          `Circular import detected: ${imp}`,
          imp,
          path,
        );
        console.log(fullMessage);
        process.exit(1);
      }
    }
  },
});
