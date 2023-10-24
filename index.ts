#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const entryPoint = process.argv[2];
if (!entryPoint || typeof Bun === "undefined") {
  console.log("Usage: bun check-circular-imports <entryPoint>");
  process.exit(1);
}

const tsxTranspiler = new Bun.Transpiler({ loader: "tsx" });
const tsTranspiler = new Bun.Transpiler({ loader: "ts" });

const graph = new Map<string, string[]>();

const canReach = (from: string, target: string): boolean => {
  if (from === target) return true;
  const imports = graph.get(from);
  if (!imports) return false;
  for (const imp of imports) {
    if (canReach(imp, target)) return true;
  }
  return false;
};

const buildErrorMessage = (
  message: string,
  from: string,
  target: string,
): string | false => {
  if (from === target) return message;
  const imports = graph.get(from);
  if (!imports) return false;
  for (const imp of imports) {
    const fullMessage = buildErrorMessage(`${message} -> ${imp}`, imp, target);
    if (fullMessage) return fullMessage;
  }
  return false;
};

const getImports = (path: string) => {
  const transpiler = path.endsWith("x") ? tsxTranspiler : tsTranspiler;
  const content = readFileSync(path, "utf-8");
  const dir = dirname(path);
  const imports: string[] = [];
  for (const imp of transpiler.scanImports(content)) {
    if (!imp.path.startsWith(".")) continue;
    if (imp.path.endsWith(".ts") || imp.path.endsWith(".tsx")) {
      imports.push(resolve(dir, imp.path));
    }
  }

  for (const imp of imports) {
    if (canReach(imp, path)) {
      const fullMessage = buildErrorMessage(
        `Circular import detected: ${imp}`,
        imp,
        path,
      );
      console.log(fullMessage);
      process.exit(1);
    }
  }

  graph.set(path, imports);

  for (const imp of imports) {
    if (graph.has(imp)) continue;
    getImports(imp);
  }
};

getImports(resolve(entryPoint));
