import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/** One expected diagnostic. Omitted fields are not checked. */
export interface ExpectedError {
	/** A substring of, or pattern for, the diagnostic message. */
	readonly message?: string | RegExp;
	/** The 1-based line on which the diagnostic starts. */
	readonly line?: number;
}

export interface ValidCase {
	readonly name?: string;
	readonly code: string;
	/** File name for the case, which selects the language. Defaults to `input.ts`. */
	readonly filename?: string;
}

export interface InvalidCase extends ValidCase {
	/** The number of expected diagnostics, or a description of each in order. */
	readonly errors: number | readonly ExpectedError[];
	/**
	 * The file contents after `biome lint --write --unsafe`. Use `null` to assert
	 * that no fix is applied. Omit to skip fix verification.
	 */
	readonly output?: string | null;
}

export interface RuleCases {
	readonly valid: readonly (string | ValidCase)[];
	readonly invalid: readonly InvalidCase[];
}

interface Diagnostic {
	readonly severity: string;
	readonly message: string;
	readonly category: string;
	readonly location: {
		readonly path: string;
		readonly start: { readonly line: number; readonly column: number };
	};
}

const require = createRequire(import.meta.url);
const biomeBin = join(
	dirname(require.resolve("@biomejs/biome/package.json")),
	"bin/biome",
);

/**
 * Runs a rule's cases through the real Biome CLI. Each rule gets a temporary
 * project whose configuration loads only that rule's plugin file, with Biome's
 * own lint rules disabled, so every reported diagnostic belongs to the rule.
 */
export function run(ruleName: string, ruleFile: URL, cases: RuleCases): void {
	const valid = cases.valid.map((entry) =>
		typeof entry === "string" ? { code: entry } : entry,
	);
	const all: ValidCase[] = [...valid, ...cases.invalid];
	const results = new Map<number, Diagnostic[]>();
	const outputs = new Map<number, string>();
	let root = "";

	describe(ruleName, () => {
		before(() => {
			root = mkdtempSync(join(tmpdir(), "anti-slop-test-"));
			const lintRoot = join(root, "lint");
			writeProject(lintRoot, fileURLToPath(ruleFile), all);
			for (const diagnostic of lint(lintRoot, [])) {
				const index = caseIndex(diagnostic.location.path);
				if (index === undefined) continue;
				const bucket = results.get(index) ?? [];
				bucket.push(diagnostic);
				results.set(index, bucket);
			}
			const fixed = cases.invalid
				.map((entry, offset) => ({ entry, index: valid.length + offset }))
				.filter(({ entry }) => entry.output !== undefined);
			if (fixed.length > 0) {
				const fixRoot = join(root, "fix");
				cpSync(lintRoot, fixRoot, { recursive: true });
				lint(fixRoot, ["--write", "--unsafe"]);
				for (const { entry, index } of fixed) {
					outputs.set(
						index,
						readFileSync(join(fixRoot, casePath(index, entry)), "utf8"),
					);
				}
			}
		});

		after(() => {
			if (root) rmSync(root, { recursive: true, force: true });
		});

		valid.forEach((entry, index) => {
			it(`valid: ${entry.name ?? entry.code}`, () => {
				assertNoUnexpectedDiagnostics(results.get(index) ?? [], ruleName);
				assert.deepEqual(
					ruleDiagnostics(results.get(index) ?? [], ruleName).map(
						(diagnostic) => diagnostic.message,
					),
					[],
					`expected no diagnostics for:\n${entry.code}`,
				);
			});
		});

		cases.invalid.forEach((entry, offset) => {
			const index = valid.length + offset;
			it(`invalid: ${entry.name ?? entry.code}`, () => {
				const diagnostics = results.get(index) ?? [];
				assertNoUnexpectedDiagnostics(diagnostics, ruleName);
				const reported = ruleDiagnostics(diagnostics, ruleName);
				const expected =
					typeof entry.errors === "number"
						? Array.from({ length: entry.errors }, () => ({}))
						: entry.errors;
				assert.equal(
					reported.length,
					expected.length,
					`expected ${expected.length} diagnostic(s) for:\n${entry.code}\ngot:\n${reported
						.map(
							(diagnostic) =>
								`  line ${diagnostic.location.start.line}: ${diagnostic.message}`,
						)
						.join("\n")}`,
				);
				expected.forEach((expectation: ExpectedError, position) => {
					const diagnostic = reported[position];
					assert.ok(diagnostic);
					if (expectation.line !== undefined) {
						assert.equal(diagnostic.location.start.line, expectation.line);
					}
					if (typeof expectation.message === "string") {
						assert.ok(
							diagnostic.message.includes(expectation.message),
							`expected message to include ${JSON.stringify(expectation.message)}, got ${JSON.stringify(diagnostic.message)}`,
						);
					} else if (expectation.message) {
						assert.match(diagnostic.message, expectation.message);
					}
				});
				if (entry.output !== undefined) {
					assert.equal(
						normalizeNewlines(outputs.get(index) ?? ""),
						normalizeNewlines(entry.output ?? entry.code),
						entry.output === null
							? "expected no fix to be applied"
							: "unexpected fix output",
					);
				}
			});
		});
	});
}

function writeProject(
	directory: string,
	pluginPath: string,
	cases: readonly ValidCase[],
): void {
	mkdirSync(directory, { recursive: true });
	writeFileSync(
		join(directory, "biome.json"),
		JSON.stringify({
			root: true,
			vcs: { enabled: false },
			files: { includes: ["**"] },
			formatter: { enabled: false },
			assist: { enabled: false },
			linter: { rules: { preset: "none" } },
			plugins: [pluginPath.replaceAll("\\", "/")],
		}),
	);
	cases.forEach((entry, index) => {
		const path = join(directory, casePath(index, entry));
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, entry.code);
	});
}

function casePath(index: number, entry: ValidCase): string {
	return join(`case-${index}`, entry.filename ?? "input.ts");
}

function caseIndex(path: string): number | undefined {
	const match = /case-(\d+)[\\/]/.exec(path);
	return match ? Number(match[1]) : undefined;
}

function lint(directory: string, flags: readonly string[]): Diagnostic[] {
	const result = spawnSync(
		process.execPath,
		[
			biomeBin,
			"lint",
			"--reporter=json",
			"--max-diagnostics=none",
			"--colors=off",
			...flags,
			".",
		],
		{ cwd: directory, encoding: "utf8", timeout: 60_000 },
	);
	if (result.error) throw result.error;
	const line = result.stdout
		.split("\n")
		.find((candidate) => candidate.startsWith('{"summary"'));
	if (!line) {
		throw new Error(
			`Biome produced no JSON report.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
		);
	}
	const parsed: { diagnostics: Diagnostic[] } = JSON.parse(line);
	return parsed.diagnostics;
}

function ruleDiagnostics(
	diagnostics: readonly Diagnostic[],
	ruleName: string,
): Diagnostic[] {
	// Biome does not report diagnostics in a stable order, so sort by position.
	return diagnostics
		.filter(
			(diagnostic) =>
				diagnostic.category === "plugin" &&
				diagnostic.message.endsWith(`[anti-slop/${ruleName}]`),
		)
		.toSorted(
			(left, right) =>
				left.location.start.line - right.location.start.line ||
				left.location.start.column - right.location.start.column,
		);
}

/** Parse errors and plugin crashes fail the case instead of passing silently. */
function assertNoUnexpectedDiagnostics(
	diagnostics: readonly Diagnostic[],
	ruleName: string,
): void {
	const unexpected = diagnostics.filter(
		(diagnostic) =>
			!(
				diagnostic.category === "plugin" &&
				diagnostic.message.endsWith(`[anti-slop/${ruleName}]`)
			),
	);
	assert.deepEqual(
		unexpected.map(
			(diagnostic) => `${diagnostic.category}: ${diagnostic.message}`,
		),
		[],
		"unexpected parse errors or plugin failures",
	);
}

function normalizeNewlines(text: string): string {
	return text.replaceAll("\r\n", "\n");
}
