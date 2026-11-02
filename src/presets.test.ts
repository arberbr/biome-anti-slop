import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const source = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const biomeBin = join(
	dirname(require.resolve("@biomejs/biome/package.json")),
	"bin/biome",
);

const presets = [
	{ file: "anti-slop.jsonc", rules: "rules" },
	{ file: "effect/anti-slop-effect.jsonc", rules: "effect/rules" },
];

/** One rejected README example per rule, linted through the shipped presets. */
const examples: Record<string, string> = {
	noArrayFilterMap:
		"declare const users: { active: boolean; email: string }[];\nexport const emails = users.filter((user) => user.active).map((user) => user.email);\n",
	noReduceAccumulatorCopy:
		"declare const items: number[];\nexport const all = items.reduce((acc: number[], item) => acc.concat([item]), []);\n",
	noChainedTypeAssertions:
		"declare const input: string;\nexport const user = input as object as Date;\n",
	noConditionalEmptyObjectSpread:
		"declare const timeout: number | undefined;\nexport const options = {\n\t...(timeout !== undefined ? { timeout } : {}),\n};\n",
	noKnownValueWidening:
		"type Handler = () => void;\ndeclare const startHandler: Handler;\nexport const handlers: Record<string, Handler> = {\n\tstart: startHandler,\n};\n",
	noModuleMocking: 'vi.mock("./user-store");\n',
	noObjectParameters:
		"export function save(value: object) {\n\treturn value;\n}\n",
	noReflectApply:
		"declare const operation: () => void;\nexport const value = Reflect.apply(operation, undefined, []);\n",
	noReflectGet:
		'declare const owner: object;\nexport const value = Reflect.get(owner, "key");\n',
	noRuntimeTypeof:
		'declare const input: string | number;\nif (typeof input === "string") {\n\tinput.trim();\n}\n',
	noShapeInSymbolNames: "export interface UserShape {\n\tid: string;\n}\n",
	noUnknownParameters:
		"export function handle(input: unknown) {\n\treturn input;\n}\n",
	noUnknownReturns:
		"declare const input: string;\nexport function loadUser(): unknown {\n\treturn input;\n}\n",
	noUnknownTypeAliases: "export type ExternalValue = unknown;\n",
	noUnsafeDictionaryType: "export type Metadata = Record<string, unknown>;\n",
	noWidenThenAssert:
		"interface User {\n\tid: string;\n}\ndeclare function loadUser(): User;\nconst loaded: User = loadUser();\nconst stored: unknown = loaded;\nexport const user = stored as User;\n",
	requireReadableSpacing:
		"export const first = 1;\n/** Documentation stays attached to second. */\nexport const second = 2;\n",
	requireSafetyCommentForTypeAssertion:
		"type UserId = string & { readonly brand: unique symbol };\ndeclare const value: string;\nexport const userId = value as UserId;\n",
	noManualEffectErrorTag:
		'declare const Effect: { catch(f: (error: { _tag: string }) => unknown): unknown; fail(error: unknown): unknown };\ndeclare const recover: unknown;\nexport const handled = Effect.catch((error) => (error._tag === "NotFound" ? recover : Effect.fail(error)));\n',
	noManualTagComparison:
		'declare const result: { _tag: string };\ndeclare function useReady(value: unknown): void;\nif (result._tag === "Ready") useReady(result);\n',
	noManualTaggedConstruction:
		'declare const value: number;\nexport const result = { _tag: "Ready", value };\n',
	noServiceConstructorImports:
		'import { makeIssueService } from "./issue-service.ts";\n\nexport const service = makeIssueService;\n',
	preferEffectMatch:
		'declare const kind: string;\nexport const label = kind === "a" ? "A" : kind === "b" ? "B" : "Other";\n',
};

function parseJsonc(text: string): { plugins: { path: string }[] } {
	return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""));
}

function ruleName(path: string): string {
	const base = path.split("/").at(-1)?.replace(/\.ts$/, "") ?? "";
	return base.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

describe("presets", () => {
	for (const preset of presets) {
		it(`${preset.file} lists every rule file with a matching export`, () => {
			const config = parseJsonc(
				readFileSync(join(source, preset.file), "utf8"),
			);
			const listed = config.plugins.map((plugin) =>
				plugin.path.replace(/^\.\//, ""),
			);
			const presetDirectory = dirname(preset.file);
			const files = readdirSync(join(source, preset.rules))
				.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
				.map((file) => join(preset.rules, file).replaceAll("\\", "/"))
				.map((file) =>
					presetDirectory === "."
						? file
						: file.slice(presetDirectory.length + 1),
				)
				.sort();
			assert.deepEqual([...listed].sort(), files);
			for (const path of listed) {
				const file = join(source, presetDirectory, path);
				assert.ok(existsSync(file), `${path} exists`);
				const exports = [
					...readFileSync(file, "utf8").matchAll(
						/^export (?:const|function|class|let) (\w+)/gm,
					),
				].map((match) => match[1]);
				assert.deepEqual(
					exports,
					[ruleName(path)],
					`${path} exports only its rule`,
				);
			}
		});
	}

	describe("vendored into a consumer project", () => {
		const project = mkdtempSync(join(tmpdir(), "anti-slop-consumer-"));
		after(() => rmSync(project, { recursive: true, force: true }));

		it("reports every rule's README example and nothing else", () => {
			cpSync(source, join(project, "tools/biome/anti-slop"), {
				recursive: true,
				filter: (path) => !path.endsWith(".test.ts"),
			});
			writeFileSync(
				join(project, "biome.json"),
				JSON.stringify({
					root: true,
					vcs: { enabled: false },
					files: { includes: ["**", "!tools/biome/anti-slop"] },
					formatter: { enabled: false },
					assist: { enabled: false },
					linter: { rules: { preset: "none" } },
					extends: [
						"./tools/biome/anti-slop/anti-slop.jsonc",
						"./tools/biome/anti-slop/effect/anti-slop-effect.jsonc",
					],
				}),
			);
			mkdirSync(join(project, "examples"));
			for (const [rule, code] of Object.entries(examples)) {
				writeFileSync(join(project, "examples", `${rule}.ts`), code);
			}
			const result = spawnSync(
				process.execPath,
				[biomeBin, "lint", "--reporter=json", "--max-diagnostics=none", "."],
				{
					cwd: project,
					encoding: "utf8",
					timeout: 60_000,
				},
			);
			const line = result.stdout
				.split("\n")
				.find((candidate) => candidate.startsWith('{"summary"'));
			assert.ok(line, `Biome produced no JSON report:\n${result.stderr}`);
			const report: {
				diagnostics: {
					category: string;
					message: string;
					location: { path: string };
				}[];
			} = JSON.parse(line);
			const fired = new Map<string, Set<string>>();
			const unexpected: string[] = [];
			for (const diagnostic of report.diagnostics) {
				const example =
					/examples[\\/](\w+)\.ts$/.exec(diagnostic.location.path)?.[1] ??
					diagnostic.location.path;
				const tag = /\[anti-slop\/(\w+)\]$/.exec(diagnostic.message)?.[1];
				if (diagnostic.category === "lint/performance/noAccumulatingSpread")
					continue;
				if (!tag) {
					unexpected.push(
						`${example}: ${diagnostic.category}: ${diagnostic.message}`,
					);
					continue;
				}
				const rules = fired.get(example) ?? new Set();
				rules.add(tag);
				fired.set(example, rules);
			}
			assert.deepEqual(unexpected, []);
			for (const rule of Object.keys(examples)) {
				assert.ok(
					fired.get(rule)?.has(rule),
					`${rule} reports its README example`,
				);
			}
		});
	});
});
