# anti-slop for Biome

Opinionated [Biome](https://biomejs.dev) plugins that reject low-evidence and low-signal TypeScript and JavaScript patterns.

This is a Biome port of [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), which implements the same ruleset as Oxlint plugins. The rules, their exceptions, and their messages follow the original. The implementation is rewritten against Biome's syntax tree and semantic model, and the differences are listed under [Analysis boundaries](#analysis-boundaries).

Like the original, it reflects one team's preferences and taste rather than a universal coding standard.

**This project is meant to be vendored**, not treated as a fixed npm dependency. There is no npm package. Copy the rules into your repository, read them, and change them to match your team's standards. The bundled agent skill handles the initial copy and configuration; after that, the vendored files are yours to maintain.

## Requirements

- `@biomejs/biome` **2.6.4 or later**, with `@biomejs/runtime` at exactly the same version for the plugin type declarations. [`src/COMPATIBILITY.md`](src/COMPATIBILITY.md) records the version the rules were verified against.
- The rules are [Biome JavaScript plugins](https://biomejs.dev/linter/plugins/). Biome ships that API as a **Developer Preview**, and breaking changes can land in patch releases. Pin both packages exactly, and re-verify the plugins whenever you change that version.

## Install with an agent skill

```bash
npx skills add arberbr/biome-anti-slop --skill install-anti-slop
```

Then ask your coding agent to install anti-slop in the current repository. The skill:

- copies the plugins to `tools/biome/anti-slop/`;
- installs an exactly pinned `@biomejs/biome` and `@biomejs/runtime` pair, matching an existing Biome version when one is present;
- extends the generic preset from your Biome configuration;
- ignores agent tooling directories and the vendored copy;
- validates the result.

In repositories that depend directly on Effect, it also enables the opt-in Effect preset.

To update an existing installation, ask your agent to **update anti-slop while preserving local customizations**, optionally naming an upstream revision or particular fixes. The skill stages incoming source separately, uses a three-way merge when the original upstream snapshot is recoverable, and otherwise ports reviewed changes conservatively. It preserves local rules and configuration, asks before resolving conflicting policy or enabling new rules, and records provenance for future updates.

## Manual installation

1. Copy `src/` into the target repository, for example to `tools/biome/anti-slop/`. Test files (`*.test.ts`) are not needed.
2. Install `@biomejs/biome` and `@biomejs/runtime` as development dependencies at the same exact version.
3. Extend the preset and keep the vendored files and agent tooling out of linting:

```jsonc
// biome.json
{
  "extends": ["./tools/biome/anti-slop/anti-slop.jsonc"],
  "files": {
    "includes": [
      "**",
      "!**/.agent",
      "!**/.agents",
      "!**/.claude",
      "!**/.codex",
      "!**/.continue",
      "!**/.cursor",
      "!**/.gemini",
      "!**/.opencode",
      "!**/.pi",
      "!**/.roo",
      "!**/.windsurf",
      "!tools/biome/anti-slop"
    ]
  }
}
```

The preset registers one plugin per rule, plus Biome's native `performance/noAccumulatingSpread` as the companion to `noReduceAccumulatorCopy`. Its plugin paths resolve relative to the preset itself (`"resolutionKind": "config"`), and Biome merges `plugins` arrays across `extends`, so your own plugins keep working.

Do not rename the presets to `biome.json` or `biome.jsonc`. Biome treats a file with either name anywhere in a project as a nested root configuration and refuses to run.

### Optional Effect rules

The Effect-specific rules live in a separate preset, so projects that do not use Effect do not inherit Effect architecture policy:

```jsonc
{
  "extends": [
    "./tools/biome/anti-slop/anti-slop.jsonc",
    "./tools/biome/anti-slop/effect/anti-slop-effect.jsonc"
  ]
}
```

## Configuration

Biome plugin entries take a path and optional `includes` globs, but no severity or options. The vendored source holds those settings instead:

| To | Edit |
| --- | --- |
| Disable a rule | Remove its entry from `anti-slop.jsonc`. |
| Scope a rule to some files | Add `"includes": ["src/**", "!**/*.test.ts"]` to its entry. |
| Change severity | `SEVERITY` in `shared/report.ts`. It applies to every rule; default `"error"`. |
| Allow `typeof` inside type guards | `ALLOW_IN_TYPE_GUARDS` in `rules/no-runtime-typeof.ts`; default `false`. |
| Accept other safety-comment markers | `MARKERS` in `rules/require-safety-comment-for-type-assertion.ts`; default `["SAFETY"]`. |

Biome labels every plugin diagnostic `plugin`, so each message ends with the rule that produced it, such as `[anti-slop/noReflectGet]`. Suppress one occurrence with the rule's name:

```ts
// biome-ignore lint/plugin/noReflectGet: the descriptor is validated by the caller
const value = Reflect.get(owner, key);
```

## Rules

### Generic rules

- `noArrayFilterMap`: rejects adjacent eager array filter/map passes while allowing lazy iterator pipelines.
- `noReduceAccumulatorCopy`: rejects non-spread accumulator copies inside reducers; complements native `performance/noAccumulatingSpread`.
- `noChainedTypeAssertions`: rejects nested `as` and angle-bracket assertions that fabricate evidence; chains made only of `as const` remain valid.
- `noConditionalEmptyObjectSpread`: reports object spreads that use a conditional `{}` branch to omit fields. It intentionally has no autofix, because omitting a field is not equivalent to assigning `undefined`.
- `noKnownValueWidening`: rejects known expressions flowing into explicit `unknown`, `object`, anonymous-object, or open-dictionary targets, including known arguments passed to local `unknown` type predicates. Empty dictionary accumulators and finite-key `Record` targets remain valid.
- `noModuleMocking`: rejects Vitest and Jest `mock`, `doMock`, and `unstable_mockModule` calls in favor of real dependency seams.
- `noObjectParameters`: rejects `object`, unions containing it, and scoped or transparent generic aliases that resolve to it on function inputs.
- `noReflectApply`: rejects global `Reflect.apply` in favor of typed function calls.
- `noReflectGet`: rejects global `Reflect.get` in favor of typed property access or boundary parsing.
- `noRuntimeTypeof`: requires boundary parsing instead of ad hoc `typeof` narrowing. Existence probes against the string `"undefined"` are allowed, and type predicates can be allowed explicitly.
- `noShapeInSymbolNames`: rejects the case-insensitive substring `shape` in locally owned symbol names, while allowing static member names such as Zod's `schema.shape` that cannot be renamed locally.
- `noUnknownParameters`: rejects `unknown`, and unions containing it, on function inputs, except the explicit `cause` convention and the exact subject of a type predicate.
- `noUnknownReturns`: rejects explicit function contracts that resolve to `unknown`, `Promise<unknown>`, or `PromiseLike<unknown>`, including through scoped and transparent generic aliases.
- `noUnknownTypeAliases`: rejects scoped and transparent generic aliases whose resolved type is `unknown`.
- `noUnsafeDictionaryType`: rejects dictionary value contracts based on `unknown`, `any`, `object`, `{}`, and semantic equivalents. Generic constraints such as `T extends Record<string, unknown>` are allowed.
- `noWidenThenAssert`: rejects immutable local flows that widen known evidence to `unknown`, `any`, `object`, or a broad record and later assert it back to a narrower type.
- `requireReadableSpacing`: autofixes missing blank lines between top-level declarations, around multiline bindings, before control flow and returns, and after blocks. It preserves compact groups of single-line bindings, imports, and overload signatures.
- `requireSafetyCommentForTypeAssertion`: requires each non-const assertion to have a nearby, non-empty invariant justification. The default marker is `SAFETY`.

### Effect rules

- `noManualEffectErrorTag`: rejects manual `_tag` comparisons and switches inside broad `Effect.catch`, `Effect.catchAll`, and `Effect.catchIf` handlers, in favor of tagged error handlers.
- `noManualTagComparison`: rejects direct `_tag` comparisons and `_tag` switches in favor of `Match`, `Predicate.isTagged`, or tagged-enum matching.
- `noManualTaggedConstruction`: rejects literal `_tag` object construction in favor of Schema, tagged class/error, or `Data.taggedEnum` constructors. `Match.when` and `Match.not` patterns remain allowed.
- `noServiceConstructorImports`: rejects named `make<CapabilityName>` imports from relative project modules outside `*.test.*` and `*.spec.*` files. Runtime callers should import the owning Layer and yield the contextual service instead. Package and path-alias imports, default imports, and static constructors such as `WorkspaceName.make` are outside the rule.
- `preferEffectMatch`: rejects chained literal ternaries over the same value in favor of Effect's `Match` API.

## Analysis boundaries

The rules use Biome's syntax tree and semantic model, not a TypeScript type checker. They resolve same-file aliases, including block-scoped aliases, forward references, and transparent generic aliases, but they do not infer imported type definitions or cross-file call signatures. Rules that inspect calls therefore document when enforcement is intentionally local.

Biome's plugin API also shapes what the rules can see:

- **Comments before a file's first statement are invisible.** Biome trims the file's leading trivia before plugins see it. As a result, `requireSafetyCommentForTypeAssertion` cannot see a `// SAFETY:` comment above the first statement of a file. It still reports the assertion and suggests moving the justification inside the statement (`const id = /* SAFETY: … */ value as UserId;`).
- **Node identity is structural.** Plugin node handles have no stable identity, so bindings and nodes are compared by kind and source text along their ancestor chain. Two textually identical declarations under textually identical parents cannot be told apart. They receive the same analysis anyway, so this is harmless in practice.
- **No spacing fix after a trailing comment.** When the previous line ends with a comment (`a(); // note`), `requireReadableSpacing` reports without a fix, because Biome plugin fixes cannot move comments. Insert that blank line by hand.
- **Escapes are not decoded.** Identifiers and string keys that spell a character with an escape sequence, such as a Unicode escape for one letter of `shape` or a hex escape for the underscore in `_tag`, are compared as written and not recognized.
- **Global names.** `noModuleMocking` treats any `vi` or `jest` without a local binding as the test framework global, and `Reflect` must not resolve to a local binding.

The port also differs from the Oxlint original in a few deliberate ways:

- Optional chains are covered: `value?._tag === "Ready"` is reported by `noManualTagComparison`, and `` owner[`get`] `` (a template literal with no substitutions) counts as a static member name.
- Interfaces resolve through the semantic model. Empty interfaces declared inside blocks are now reported, and a local alias or type parameter that shadows an interface's name no longer causes a false positive.
- `this` parameters are function inputs, so `this: object` and `this: unknown` are reported. When `noKnownValueWidening` matches a type predicate's subject to a call argument, it skips the `this` parameter, which the original miscounted.
- Shorthand names such as `{ shape }`, `import { shape }`, and `export { shape }` produce one `noShapeInSymbolNames` diagnostic rather than two.
- Default-export overload signatures stay grouped under `requireReadableSpacing`.

### Verification against the original

Besides the ported rule tests, the port was checked differentially against the original Oxlint plugins (Oxlint 1.78.0). Both linted the same real code with every rule enabled, and their diagnostics were compared by file, rule, and line:

| Corpus | Size | Rules that fired | Differences |
| --- | --- | --- | --- |
| [Hono](https://github.com/honojs/hono) `src/` | 314 files, 83k lines | 14 | none |
| [Effect](https://github.com/Effect-TS/effect) `platform`, `cli`, `sql` packages | 364 files, 92k lines | 18 | 6 extra `noManualTagComparison` reports, all `value?._tag` comparisons (the optional-chain coverage above) |

Neither run produced a plugin crash.

## Performance

JavaScript plugins run in Biome's embedded engine and are much slower than Biome's native rules. With both presets enabled on the corpora above, `biome lint` took about 4.4 s (Hono) and 5.9 s (Effect packages), against about 1.4 s and 1.6 s for the original Oxlint plugins. Most of that cost is per rule, per file. The three rules that need comments or source positions (`requireReadableSpacing`, `requireSafetyCommentForTypeAssertion`, and `noWidenThenAssert`) are the most expensive. To lint faster, remove rules you do not need from the preset, or scope them with `includes`.

## Violation examples

Each snippet below is rejected by the named rule.

### `noArrayFilterMap`

```ts
const users: User[] = loadUsers();
const emails = users.filter(user => user.active).map(user => user.email);
const found = users.map(lookup).filter(value => value !== undefined);
```

Prefer lazy iterator helpers where the target runtime supports them:

```ts
const emails = users.values()
  .filter(user => user.active)
  .map(user => user.email)
  .toArray();
```

A single `flatMap(user => user.active ? [user.email] : [])`, or a reducer that pushes into a fresh local array, is also allowed. Iterator helpers avoid intermediate arrays and per-item wrapper arrays, but they are not guaranteed to be faster. Check runtime support; TypeScript library declarations do not polyfill them.

The rule recognizes array literals, direct array and tuple annotations, immutable local aliases, and supported array-preserving method chains. Unknown receivers (including imported factory results and unannotated parameters), type aliases, and property-based array types are not inferred. Iterator pipelines are not flagged. Both `filter().map()` and `map().filter()` are covered, whatever the predicate. There is no autofix: callback order, indexes, `thisArg`, sparse arrays, and truthiness filtering must be reviewed before changing APIs.

### `noReduceAccumulatorCopy`

```ts
items.reduce((acc, item) => Object.assign({}, acc, { [item.id]: item }), {});
items.reduce((acc, item) => acc.concat([item]), []);
items.reduce((acc, item) => {
  const next = acc.slice();
  next.push(item);
  return next;
}, []);
```

Instead, mutate a fresh, locally owned accumulator and return it:

```ts
items.reduce((acc, item) => {
  acc.push(item);
  return acc;
}, []);
```

`Object.assign(acc, item)` is also allowed. Copying individual input items is not copying accumulated state.

The rule covers inline `reduce`/`reduceRight` callbacks, including index parameters, and immutable local accumulator aliases. It detects:

- global `Object.assign` with an object-literal target and the accumulator as a source;
- global `Array.from(acc)`;
- array accumulator calls to `concat`, `slice`, `toSpliced`, `toSorted`, `toReversed`, and `with`.

The array copy methods are flagged only when the initial value is locally known to be an array, so string concatenation and unknown custom collections are not flagged. Reducer method names are syntactic evidence, not proof of the receiver's runtime type. Named callbacks, nested functions, indirect copy helpers, nested accumulator properties, and reassigned aliases are outside its scope. Copying a bounded accumulator is not necessarily quadratic, but these patterns are rejected because a growing accumulator can be.

The preset also enables Biome's native `performance/noAccumulatingSpread`, which covers array and object spreads in reducers. Neither rule proves that every quadratic reduction is absent. There is no automatic mutation rewrite, because accumulator ownership cannot be established syntactically.

### `noChainedTypeAssertions`

```ts
const user = input as object as User;
```

### `noConditionalEmptyObjectSpread`

```ts
const options = {
  ...(timeout !== undefined ? { timeout } : {}),
};
```

### `noKnownValueWidening`

```ts
const handlers: Record<string, Handler> = {
  start: startHandler,
};
```

This discards the known `start` key. Preserve inference, or use `satisfies Record<string, Handler>` instead.

Known values must not be widened back to `unknown` through a local type predicate:

```ts
function isUser(value: unknown): value is User {
  return UserSchema.safeParse(value).success;
}

declare const user: User;
isUser(user);
```

Call the predicate at the unparsed boundary, while the argument is still `unknown`.

### `noModuleMocking`

```ts
vi.mock("./user-store");
```

### `noObjectParameters`

```ts
function save(value: object) {}
```

### `noReflectApply`

```ts
const value = Reflect.apply(operation, owner, args);
```

### `noReflectGet`

```ts
const value = Reflect.get(owner, key);
```

### `noRuntimeTypeof`

```ts
if (typeof input === "string") {
  useName(input);
}
```

Schema-free projects can allow `typeof` checks directly inside type predicate and assertion functions while still rejecting ad hoc checks elsewhere. Set `ALLOW_IN_TYPE_GUARDS = true` at the top of the vendored `rules/no-runtime-typeof.ts`.

Existence probes such as `typeof document === "undefined"` are always allowed, because they establish whether a binding exists rather than narrow its representation.

### `noShapeInSymbolNames`

```ts
interface UserShape {
  id: string;
}
```

Static member reads such as `schema.shape` are allowed, because the member name belongs to the value's owner and cannot be renamed locally.

### `noUnknownParameters`

```ts
function handle(input: unknown) {}
```

A type predicate may accept `unknown` for the parameter it narrows; other `unknown` parameters on the same function remain rejected.

### `noUnknownReturns`

```ts
function loadUser(): unknown {
  return input;
}
```

### `noUnknownTypeAliases`

```ts
type ExternalValue = unknown;
```

### `noUnsafeDictionaryType`

```ts
type Metadata = Record<string, unknown>;
type OtherMetadata = { [key: string]: object };
```

### `noWidenThenAssert`

```ts
const loaded: User = loadUser();
const stored: unknown = loaded;
const user = stored as User;
```

### `requireReadableSpacing`

```ts
export const first = 1;
/** Documentation stays attached to second. */
export const second = 2;
```

The safe autofix inserts a blank line before the documentation. Adjacent single-line variable declarations stay grouped at any scope, including exported bindings at module scope. A binding with its own leading comment starts a new group, as `second` does above. Multiline bindings and control-flow boundaries get blank lines. Adjacent function overload signatures and their implementation stay grouped. Existing blank lines are never removed. The rule takes no options; edit the vendored policy if your team's preferences differ.

Run `biome check --write`, which applies the fix and then formats, and lint again. The rule only inserts line breaks. It does not add braces, wrap expressions, sort imports, or infer every logical group. Leave indentation and wrapping to Biome's formatter.

The policy follows the original, which was built on ESLint Stylistic's `padding-line-between-statements`. The Biome implementation is a rewrite, and its provenance is recorded in [`src/vendor/eslint-stylistic/UPSTREAM.md`](src/vendor/eslint-stylistic/UPSTREAM.md) (MIT).

### `requireSafetyCommentForTypeAssertion`

```ts
const userId = value as UserId;
```

Add a specific justification immediately before a necessary assertion:

```ts
// SAFETY: parseUserId validated the identifier before branding it.
const userId = value as UserId;
```

Comments immediately above exported declarations are recognized. Repositories with an established convention can replace or extend `MARKERS` in the vendored rule. Every marker must still be followed by a colon and a non-empty justification.

### Effect: `noServiceConstructorImports`

```ts
import { makeIssueService } from "./issue-service.ts";
```

Import the owning Layer and yield `IssueService` instead. Focused `*.test.*` and `*.spec.*` files may import the constructor directly.

### Effect: tagged values and matching

`noManualTagComparison` rejects direct tag checks:

```ts
if (result._tag === "Ready") useReady(result);
```

Use `Predicate.isTagged` for a predicate, or `Match` for branching:

```ts
if (Predicate.isTagged("Ready")(result)) useReady(result);
```

`noManualTaggedConstruction` rejects literal tag objects:

```ts
const result = { _tag: "Ready", value };
```

Use the existing Schema, tagged class/error, or `Data.taggedEnum` constructor instead, such as `Ready.make({ value })`. Object patterns passed directly to `Match.when` and `Match.not` remain allowed.

`noManualEffectErrorTag` rejects manual tag branching in broad catch handlers:

```ts
program.pipe(
  Effect.catch((error) =>
    error._tag === "NotFound" ? recover : Effect.fail(error)
  )
);
```

Use the selective error operator:

```ts
program.pipe(Effect.catchTag("NotFound", () => recover));
```

For a tagged `error.reason`, use `Effect.catchReason` or `Effect.catchReasons`.

`preferEffectMatch` rejects repeated literal ternaries over the same value:

```ts
const label = kind === "a" ? "A" : kind === "b" ? "B" : "Other";
```

Use `Match`:

```ts
const label = Match.value(kind).pipe(
  Match.when("a", () => "A"),
  Match.when("b", () => "B"),
  Match.orElse(() => "Other")
);
```

These rules are syntactic. They recognize direct `Effect.catch*` and `Match.when`/`Match.not` calls under those exact identifiers, and they neither resolve import aliases nor verify that similarly named objects came from Effect. `preferEffectMatch` compares the source text of the repeatedly tested expression; it does not infer its type or prove exhaustiveness.

## Development

```bash
pnpm install
pnpm check
```

`src/` is canonical. `pnpm check` runs:

- `biome ci`;
- every rule's test suite, each case run through the real Biome CLI by [`test/rule-tester.ts`](test/rule-tester.ts);
- an end-to-end test that vendors `src/` into a temporary project and lints the README examples through the presets;
- TypeScript typechecking;
- the skill-asset drift check.

After changing production source, run `pnpm sync:skill-assets`; CI checks that the skill's bundled copy remains identical. [`AGENTS.md`](AGENTS.md) documents the Biome plugin runtime behavior the rules depend on.

## License

MIT. The rule design, messages, and documentation derive from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) by Dillon Mulroy, under MIT.
