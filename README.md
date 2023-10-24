# check-circular-imports

Fast check for circular imports in a TS codebase based on Bun scanImports builtin.

```bash
bun add --dev @arnaud-barre/check-circular-imports
```

The check assume all source code imports are relative and use full path (extension + no index import).
Imports other than `.ts` & `.tsx` are skipped.

```bash
bun check-circular-imports <entryPoint>
```

On a mac M1 for a codebase of ~400 TS files it runs in 50ms. 

## Related

This project is part of a personal work to make my build tools out of resolution-hell

- https://github.com/ArnaudBarre/prettier-plugin-sort-imports
- https://github.com/ArnaudBarre/eslint-config/blob/main/eslint-plugin/rules/imports.ts
