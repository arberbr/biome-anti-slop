# Repository guidance

- `src/` is the canonical plugin implementation. `skills/install-anti-slop/assets/anti-slop/` is a generated copy; never edit it by hand.
- Keep rules generic and suitable for reuse across repositories. Do not add application-specific names, paths, or exceptions.
- Rules are Biome JavaScript plugins built on `@biomejs/runtime/plugin`. Do not add another production parser or runtime dependency.
- One rule per file under `src/rules/` (or `src/effect/rules/`). The file's only export is `export const <ruleName> = defineRule(...)`; Biome uses the export name as the rule name, so it must match the name passed to `report()` and the entry in `src/anti-slop.jsonc`.
- Add focused cases to the co-located `*.test.ts` for every semantic rule change. Tests run each case through the real Biome CLI via `test/rule-tester.ts`.
- Run `pnpm sync:skill-assets` after changing production source.
- Run `pnpm check` before committing.

## Biome plugin runtime facts

These are verified against Biome 2.6.4. JavaScript plugins are a Developer Preview, so re-verify them when upgrading `@biomejs/biome` and `@biomejs/runtime` (always the same exact version).

- **Sandbox.** Plugins run in Biome's embedded JavaScript engine: no Node.js APIs, no `require`, no `process`, no `console`. Relative `.ts` imports between plugin files work. `@biomejs/runtime/plugin` is provided by Biome itself; the npm package only supplies types.
- **Node types.** `node_modules/@biomejs/runtime/js_ast.d.ts` lists every node kind (`JsNodeByKind`) and field. List fields such as `call.arguments.args` are plain arrays. Token fields such as `name.valueToken` are strings; `node.token("valueToken")` returns the token handle that mutations need.
- **Fresh module per file.** Biome evaluates every plugin module, including the shared helpers it imports, separately for each file and each rule. Module-level state never carries across files or rules, so nothing can be cached between them.
- **Text.** `node.text` is the node's source with leading and trailing trivia trimmed. Nothing exposes offsets or comments directly. Each read copies the node's source out of the runtime, so avoid it in tree-wide loops; inside a `SourceIndex`, use `index.textOf(entry)`.
- **CST, not ESTree.** Biome keeps parentheses as nodes (`JS_PARENTHESIZED_EXPRESSION`, `JS_PARENTHESIZED_ASSIGNMENT`), and list containers appear as parents: a call argument's parent is `JS_CALL_ARGUMENT_LIST`, inside `JS_CALL_ARGUMENTS`. An assertion on an assignment target, such as `(x as T) += 1`, is `TS_AS_ASSIGNMENT` or `TS_TYPE_ASSERTION_ASSIGNMENT`, not an expression kind. `as const` is a `TS_REFERENCE_TYPE` named `const`. `JsLiteralMemberName.value` keeps the quotes of string keys.
- **Bindings.** `Binding.allWrites()` excludes the declaration's own initializer. A merged interface's binding points at its last declaration. Overloaded functions resolve to a single declaration. Avoid `Binding.scope()` for type declarations.
- **No identity.** Every property access returns a fresh handle: `node.parent === node.parent` is `false`, and so is comparing `binding.syntax()` results. Never compare nodes with `===`.
- **Positions, comments, identity.** Use `SourceIndex` from `src/shared/source.ts`. Query the root (`ast("JS_MODULE", "JS_SCRIPT")` or `semantic(...)` of the same) and build one index per run. It gives every node `start`/`end` offsets, leading trivia, and comments, and `find(node)` maps an outside handle, such as `binding.syntax()`, back to a located entry. The root's text excludes the file's leading trivia, so a comment before the very first statement is invisible.
- **Globals.** `context.model.binding(reference)` returns `undefined` for globals and unresolved names. `isUnshadowedGlobal` in `src/shared/syntax.ts` wraps this.
- **Type references resolve.** `model.binding()` on the `JsReferenceIdentifier` inside a `TsReferenceType` returns the type alias, interface, type parameter, or import binding, with block scoping respected.
- **Diagnostics.** Report through `report()` in `src/shared/report.ts`. Biome labels every plugin diagnostic `plugin`, so the message is suffixed with `[anti-slop/<ruleName>]`. Users suppress a rule with `// biome-ignore lint/plugin/<ruleName>: <reason>`.
- **Crashes.** An exception thrown in `run()` becomes an `information` diagnostic, `Rule <name> errored: ...`, rather than failing the lint. The test harness fails any case that produces one.
- **Fixes.** Build them with `createMutation(node)` and pass `{ mutation, message, kind }` to `report()`. `factory.token(kind, text)` rejects any text that differs from a keyword's or punctuator's fixed spelling. Replacements keep the replaced token's own trivia. `biome lint --write` reapplies fixes until none remain, so a fix must make its rule stop reporting, or `--write` never terminates.
- **Presets.** `src/anti-slop.jsonc` and `src/effect/anti-slop-effect.jsonc` are shared configurations that consumers `extends`. Their plugin entries use `"resolutionKind": "config"`, so paths resolve next to the preset, and `plugins` arrays merge across `extends`. Never name a preset `biome.json` or `biome.jsonc`: Biome treats a file with that name anywhere in a project as a nested root configuration and refuses to run.
- **Performance.** Each plugin carries a fixed per-file cost, because its modules are evaluated for every file, and plain JavaScript in the embedded engine is far slower than in Node.js. On an 83,000-line corpus, an empty plugin took about 0.3 s, and building a full `SourceIndex` took about 1.1 s. In scanners, use `charCodeAt` rather than indexing strings (`text[i]` allocates a string), and build lookup tables lazily.
- **Diagnostic order.** Biome does not report a file's diagnostics in a stable order. The test harness sorts them by position.
- **Debugging.** With no `console`, report temporary diagnostics that carry the values you need, and inspect them with `pnpm exec biome lint --reporter=json <file>`.

## Testing a single rule

```bash
node --test src/rules/no-reflect-get.test.ts
```

`run(ruleName, ruleFileUrl, { valid, invalid })` mirrors ESLint's RuleTester. A case can set `filename` (for example `input.tsx` or `user.test.ts`). An invalid case lists `errors`, either a count or `{ message?, line? }` entries in order, plus an optional `output` (expected contents after `biome lint --write --unsafe`; `null` asserts that no fix applies).
