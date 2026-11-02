import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { run } from "../../test/rule-tester.ts";

const ruleFile = new URL("./require-readable-spacing.ts", import.meta.url);
const expected = "Expected a blank line before this statement.";

run("requireReadableSpacing", ruleFile, {
	valid: [
		"import { a } from 'a';\nimport { b } from 'b';\n\nexport const c = a + b;",
		"function f() {\nconst a = 1;\nconst b = 2;\n\nreturn a + b;\n}",
		"function f() { return 1; }",
		"function f(a: string): string;\nfunction f(a: number): number;\nfunction f(a: string | number) { return a; }",
		"export function f(a: string): string;\nexport function f(a: number): number;\nexport function f(a: string | number) { return a; }",
		"const f = Effect.gen(function* () {\nconst a = yield* A;\nconst b = yield* B;\n\nreturn a + b;\n});",
		"export type A = string;\n\n/** B documentation. */\nexport type B = number;",
		"function f() { if (ok) { go(); } else { stop(); } }",
		"function f() {\n// return docs\nreturn 1;\n}",
		"const a = 1;\n\n\nconst b = 2;",
		"switch (x) { case 1: case 2: go(); break; default: stop(); }",
		"const a = 1;\nconst b = 2;",
		"export const a = 1;\nexport const b = 2;",
		"const a = 1;\nlet b = 2;\nvar c = 3;",
		"function f() {\nconst a = 1;\nusing b = open();\n\nreturn a;\n}",
		"const a = 1;\nconst b = 2;\n\nconst c = 3;",
		"const a = 1; // trailing\nconst b = 2;",
		"/** Heads a group. */\nconst a = 1;\nconst b = 2;",
		"import { a } from 'a';\n\nconst b = a;\nexport const c = b;",
		{
			name: "a blank line between comments satisfies the policy",
			code: "const a = 1;\n// about b\n\nconst b = {\n};",
		},
		{
			name: "default-export overloads stay grouped",
			code: "export default function f(a: string): string;\nexport default function f(a: string | number) { return a; }",
		},
		{
			name: "declared functions and bindings stay grouped",
			code: "declare function a(): void;\ndeclare function b(): void;\n\ndeclare const c: number;\nexport declare const d: string;",
		},
		{
			name: "interface and type literal members are not statements",
			code: "interface A {\na(): void;\nb(): void;\n}\n\ntype B = {\na(): void;\nb(): void;\n};",
		},
		{
			name: "class members are not statements",
			code: "class A {\na = 1;\nb() {}\nc = 2;\n}",
		},
		{
			name: "expression statements group inside blocks",
			code: "function f() {\nfoo();\nbar();\nconst a = 1;\nbaz(a);\n}",
		},
		{
			name: "consecutive imports and import types",
			code: "import a from 'a';\nimport type { B } from 'b';\nimport 'c';",
		},
		{
			name: "single-line bindings group in tsx",
			filename: "input.tsx",
			code: "const a = <div />;\nconst b = <span>{a}</span>;",
		},
	],
	invalid: [
		{
			code: "const a = 1;\n/** B docs. */\nconst b = 2;",
			output: "const a = 1;\n\n/** B docs. */\nconst b = 2;",
			errors: [{ message: expected, line: 3 }],
		},
		{
			code: "const a = 1;\n// b\nconst b = 2;",
			output: "const a = 1;\n\n// b\nconst b = 2;",
			errors: 1,
		},
		{
			code: "const a = 1;\nconst b = {\n};\nconst c = 3;",
			output: "const a = 1;\n\nconst b = {\n};\n\nconst c = 3;",
			errors: [{ line: 2 }, { line: 4 }],
		},
		{
			code: "const a = 1;\nfoo(a);",
			output: "const a = 1;\n\nfoo(a);",
			errors: 1,
		},
		{
			code: "export const a = 1;\n/** B docs. */\nexport type B = number;",
			output: "export const a = 1;\n\n/** B docs. */\nexport type B = number;",
			errors: 1,
		},
		{
			name: "a trailing comment on the previous line blocks the fix",
			code: "const a = 1; // trailing\n// leading\nconst b = 2;",
			output: null,
			errors: 1,
		},
		{
			name: "a trailing block comment blocks the fix",
			code: "foo(); /* note */ bar();",
			output: null,
			errors: 1,
		},
		{
			code: "const a = 1; foo(a);",
			output: "const a = 1;\n\n foo(a);",
			errors: 1,
		},
		{
			code: "import { a } from 'a';\nconst b = a;",
			output: "import { a } from 'a';\n\nconst b = a;",
			errors: 1,
		},
		{
			code: "function f() {\nconst a = 1;\nreturn a;\n}",
			output: "function f() {\nconst a = 1;\n\nreturn a;\n}",
			errors: [{ line: 3 }],
		},
		{
			code: "function f() {\nconst a = 1;\nif (a) go();\n}",
			output: "function f() {\nconst a = 1;\n\nif (a) go();\n}",
			errors: 1,
		},
		{
			code: "function f() {\nif (ok) { go(); }\nstop();\n}",
			output: "function f() {\nif (ok) { go(); }\n\nstop();\n}",
			errors: 1,
		},
		{
			code: "const f = Effect.gen(function* () {\nconst a = yield* A;\nconst b = yield* B;\nconst dispatch = Effect.fn('dispatch')(function* () {\nyield* a;\n});\nreturn dispatch;\n});",
			output:
				"const f = Effect.gen(function* () {\nconst a = yield* A;\nconst b = yield* B;\n\nconst dispatch = Effect.fn('dispatch')(function* () {\nyield* a;\n});\n\nreturn dispatch;\n});",
			errors: 2,
		},
		{
			code: "export interface A {}\nexport class B {}",
			output: "export interface A {}\n\nexport class B {}",
			errors: 1,
		},
		{
			code: "const a = 1\n;[1].forEach(f)",
			output: "const a = 1\n\n;[1].forEach(f)",
			errors: 1,
		},
		{
			code: "function f() {\nfoo();\nwhile (ok) go();\n}",
			output: "function f() {\nfoo();\n\nwhile (ok) go();\n}",
			errors: 1,
		},
		{
			name: "a blank line inside a block comment does not count",
			code: "foo();\n/*\n\n*/\nfunction g() {}",
			output: "foo();\n\n/*\n\n*/\nfunction g() {}",
			errors: 1,
		},
		{
			name: "a documented binding starts a new group",
			code: "const a = 1;\nconst b = 2;\n/** C docs. */\nconst c = 3;",
			output: "const a = 1;\nconst b = 2;\n\n/** C docs. */\nconst c = 3;",
			errors: [{ line: 4 }],
		},
		{
			name: "top-level declarations",
			code: "function a() {}\nfunction b() {}\ntype C = string;\ninterface D {}",
			output:
				"function a() {}\n\nfunction b() {}\n\ntype C = string;\n\ninterface D {}",
			errors: 3,
		},
		{
			name: "nested declarations",
			code: "function f() {\nfoo();\nclass A {}\ntype B = A;\nreturn new A();\n}",
			output:
				"function f() {\nfoo();\n\nclass A {}\n\ntype B = A;\n\nreturn new A();\n}",
			errors: 3,
		},
		{
			name: "after a block-like case clause",
			code: "switch (x) {\ncase 1: {\ngo();\n}\ncase 2:\nstop();\n}",
			output: "switch (x) {\ncase 1: {\ngo();\n}\n\ncase 2:\nstop();\n}",
			errors: [{ line: 5 }],
		},
		{
			name: "control flow inside a case clause",
			code: "function f() {\nswitch (x) {\ncase 1:\nfoo();\nreturn 1;\n}\n}",
			output:
				"function f() {\nswitch (x) {\ncase 1:\nfoo();\n\nreturn 1;\n}\n}",
			errors: 1,
		},
		{
			name: "after an immediately invoked function",
			code: "function f() {\n(() => go())();\nfoo();\n}",
			output: "function f() {\n(() => go())();\n\nfoo();\n}",
			errors: 1,
		},
		{
			name: "after a block-bodied arrow binding",
			code: "function f() {\nconst g = () => {};\nfoo(g);\n}",
			output: "function f() {\nconst g = () => {};\n\nfoo(g);\n}",
			errors: 1,
		},
		{
			name: "after a directive",
			code: "function f() {\n'use strict';\nreturn 1;\n}",
			output: "function f() {\n'use strict';\n\nreturn 1;\n}",
			errors: 1,
		},
		{
			name: "labeled loop",
			code: "function f() {\nfoo();\nouter: for (;;) { break outer; }\n}",
			output: "function f() {\nfoo();\n\nouter: for (;;) { break outer; }\n}",
			errors: 1,
		},
		{
			name: "namespace bodies",
			code: "namespace N {\nexport const a = 1;\nif (a) go();\n}",
			output: "namespace N {\nexport const a = 1;\n\nif (a) go();\n}",
			errors: 1,
		},
		{
			name: "static blocks",
			code: "class A {\nstatic {\nfoo();\nif (ok) go();\n}\n}",
			output: "class A {\nstatic {\nfoo();\n\nif (ok) go();\n}\n}",
			errors: 1,
		},
		{
			name: "javascript files",
			filename: "input.js",
			code: "const a = require('a');\nmodule.exports = a;",
			output: "const a = require('a');\n\nmodule.exports = a;",
			errors: 1,
		},
		{
			name: "keyword, template, and regular expression last tokens",
			code: "function f() {\nlet a = null\nif (a) go()\nconst b = `x`\nif (b) go()\nconst c = /x/g\nreturn c\n}",
			output:
				"function f() {\nlet a = null\n\nif (a) go()\nconst b = `x`\n\nif (b) go()\nconst c = /x/g\n\nreturn c\n}",
			errors: 3,
		},
		{
			name: "jsx last token",
			filename: "input.tsx",
			code: "function F() {\nconst a = <div>text</div>\nreturn a\n}",
			output: "function F() {\nconst a = <div>text</div>\n\nreturn a\n}",
			errors: 1,
		},
		{
			name: "windows line endings",
			code: "const a = 1;\r\nfoo(a);\r\n",
			output: "const a = 1;\r\n\r\nfoo(a);\r\n",
			errors: 1,
		},
	],
});

/** Port of the original CLI check: lint rejects, fix plus format applies, and the result stays stable. */
describe("requireReadableSpacing with the formatter", () => {
	it("fixes, formats, and then lints clean", () => {
		const require = createRequire(import.meta.url);
		const biome = join(
			dirname(require.resolve("@biomejs/biome/package.json")),
			"bin/biome",
		);
		const root = mkdtempSync(join(tmpdir(), "anti-slop-spacing-"));
		const biomeCli = (...args: string[]) => {
			const result = spawnSync(
				process.execPath,
				[biome, ...args, "--colors=off", "."],
				{
					cwd: root,
					encoding: "utf8",
					timeout: 60_000,
				},
			);
			return {
				status: result.status,
				output: `${result.stdout}\n${result.stderr}`,
			};
		};
		try {
			writeFileSync(
				join(root, "biome.json"),
				JSON.stringify({
					root: true,
					vcs: { enabled: false },
					assist: { enabled: false },
					linter: { rules: { preset: "none" } },
					plugins: [fileURLToPath(ruleFile).replaceAll("\\", "/")],
				}),
			);
			const first = join(root, "first.ts");
			const second = join(root, "second.ts");
			writeFileSync(
				first,
				"export const a = 1;\n/** Attached to b. */\nexport const b = 2;\n",
			);
			writeFileSync(
				second,
				"export function f() {\nconst a = 1;\nconst b = 2;\nreturn a + b;\n}\n",
			);

			const rejected = biomeCli("lint");
			assert.equal(rejected.status, 1, rejected.output);
			assert.match(rejected.output, /anti-slop\/requireReadableSpacing/);

			const fixed = biomeCli("check", "--write");
			assert.equal(fixed.status, 0, fixed.output);
			assert.equal(
				readFileSync(first, "utf8"),
				"export const a = 1;\n\n/** Attached to b. */\nexport const b = 2;\n",
			);
			assert.equal(
				readFileSync(second, "utf8"),
				"export function f() {\n\tconst a = 1;\n\tconst b = 2;\n\n\treturn a + b;\n}\n",
			);

			const stable = [
				readFileSync(first, "utf8"),
				readFileSync(second, "utf8"),
			];
			const clean = biomeCli("check");
			assert.equal(clean.status, 0, clean.output);
			const repeated = biomeCli("check", "--write");
			assert.equal(repeated.status, 0, repeated.output);
			assert.deepEqual(
				[readFileSync(first, "utf8"), readFileSync(second, "utf8")],
				stable,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
