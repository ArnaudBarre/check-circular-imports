import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const pkgJson = JSON.parse(readFileSync("package.json", "utf-8"));
const subpathImports = pkgJson.imports as
  | Record<string, string | Record<string, string | undefined> | undefined>
  | undefined;

const tsxTranspiler = new Bun.Transpiler({ loader: "tsx" });
const tsTranspiler = new Bun.Transpiler({ loader: "ts" });

const graph = new Map<string, string[]>();

export const canReach = (from: string, target: string): boolean => {
  if (from === target) return true;
  const imports = graph.get(from);
  if (!imports) return false;
  for (const imp of imports) {
    if (canReach(imp, target)) return true;
  }
  return false;
};

export const buildPath = (
  from: string,
  target: string,
  currentPath: string[] = [],
): string[] | undefined => {
  if (from === target) return [...currentPath, target];
  const imports = graph.get(from);
  if (!imports) return undefined;
  for (const imp of imports) {
    const fullPath = buildPath(imp, target, [...currentPath, from]);
    if (fullPath) return fullPath;
  }
};

export const buildGraph = (
  path: string,
  opts?: { skipDynamicImports?: boolean },
) => {
  const transpiler = path.endsWith("x") ? tsxTranspiler : tsTranspiler;
  const content = readFileSync(path, "utf-8");
  const dir = dirname(path);
  const imports: string[] = [];
  for (const imp of transpiler.scanImports(content)) {
    if (opts?.skipDynamicImports && imp.kind === "dynamic-import") continue;
    if (imp.path.startsWith("#")) {
      let mapping = subpathImports?.[imp.path];
      if (typeof mapping === "object") mapping = mapping["default"];
      if (mapping === undefined) throw new Error(`Cannot resolve ${imp.path}`);
      imports.push(join(process.cwd(), mapping));
      continue;
    }
    if (!imp.path.startsWith(".")) continue;
    if (imp.path.endsWith(".ts") || imp.path.endsWith(".tsx")) {
      imports.push(resolve(dir, imp.path));
    }
  }

  graph.set(path, imports);

  for (const imp of imports) {
    if (graph.has(imp)) continue;
    buildGraph(imp, opts);
  }

  return graph;
};
