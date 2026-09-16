import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const pkgJson = JSON.parse(readFileSync("package.json", "utf-8"));
const subpathImports = pkgJson.imports as
  | Record<string, string | Record<string, string | undefined> | undefined>
  | undefined;

const tsxTranspiler = new Bun.Transpiler({ loader: "tsx" });
const tsTranspiler = new Bun.Transpiler({ loader: "ts" });

const graph = new Map<string, string[]>();

export const buildGraph = (
  path: string,
  opts?: {
    skipDynamicImports?: boolean;
    onNewNode?: (params: {
      path: string;
      imports: string[];
      graph: Map<string, string[]>;
    }) => void;
  },
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

  opts?.onNewNode?.({ path, imports, graph });
  graph.set(path, imports);

  for (const imp of imports) {
    if (graph.has(imp)) continue;
    buildGraph(imp, opts);
  }

  return graph;
};
