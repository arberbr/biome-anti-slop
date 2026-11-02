import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { run } from "../../test/rule-tester.ts";

const error = {
	message:
		"A `typeof` check narrows a representation without establishing its contract.",
};
const ruleUrl = new URL("./no-runtime-typeof.ts", import.meta.url);

const typeGuard =
	'function isString(value: unknown): value is string { return typeof value === "string"; }';
const arrowTypeGuard =
	'const isString = (value: unknown): value is string => typeof value === "string";';
const assertion =
	'function assertString(value: unknown): asserts value is string { if (typeof value !== "string") throw new Error(); }';
const methodTypeGuard =
	'class Guard { isString(value: unknown): value is string { return typeof value === "string"; } }';
const nonGuard =
	'function parse(value: unknown): string { if (typeof value !== "string") throw new Error(); return value; }';
const nestedInGuard =
	'function isString(value: unknown): value is string { const check = () => typeof value === "string"; return check(); }';

run("noRuntimeTypeof", ruleUrl, {
	valid: [
		'const isServer = typeof document === "undefined";',
		'const hasStorage = typeof localStorage !== "undefined";',
		'if (typeof globalThis.crypto === "undefined") throw new Error("no crypto");',
		'const missing = "undefined" === typeof process;',
		"const value = input;",
		{
			name: "loose existence probe",
			code: "const missing = typeof window == 'undefined';",
		},
		{
			name: "parenthesized existence probe",
			code: 'const missing = (typeof window) != ("undefined");',
		},
		{
			name: "type query is not a runtime check",
			code: "type Config = typeof config;",
		},
		{
			name: "void and delete are other unary operators",
			code: "void run(); delete owner.key;",
		},
	],
	invalid: [
		{
			code: 'if (typeof input === "string") use(input);',
			errors: [{ ...error, line: 1 }],
		},
		{ code: "if (typeof input === undefined) use(input);", errors: [error] },
		{ code: typeGuard, errors: [error] },
		{
			name: "assertion signature is reported by default",
			code: assertion,
			errors: [error],
		},
		{
			name: "arrow type guard is reported by default",
			code: arrowTypeGuard,
			errors: [error],
		},
		{
			name: "method type guard is reported by default",
			code: methodTypeGuard,
			errors: [error],
		},
		{ code: nonGuard, errors: [error] },
		{ code: nestedInGuard, errors: [error] },
		{
			name: "template literal is not an existence probe",
			code: "const missing = typeof window === `undefined`;",
			errors: [error],
		},
		{
			name: "relational operator",
			code: 'const odd = typeof input > "undefined";',
			errors: [error],
		},
		{
			name: "bare typeof",
			code: "const kind = typeof input;",
			errors: [error],
		},
		{
			name: "switch on typeof",
			code: "switch (typeof input) { case 'string': break; }",
			errors: [error],
		},
		{
			name: "comparing two typeofs",
			code: "const same = typeof left === typeof right;",
			errors: [error, error],
		},
	],
});

/**
 * Biome plugins take no options, so the `allowInTypeGuards` behavior is
 * exercised by linting a temporary copy of the rule with the vendored constant
 * flipped to `true`.
 */
const variantRoot = mkdtempSync(join(tmpdir(), "anti-slop-typeof-"));
after(() => rmSync(variantRoot, { recursive: true, force: true }));
const source = readFileSync(ruleUrl, "utf8");
const flipped = source.replace(
	"const ALLOW_IN_TYPE_GUARDS = false;",
	"const ALLOW_IN_TYPE_GUARDS = true;",
);
assert.notEqual(
	flipped,
	source,
	"the ALLOW_IN_TYPE_GUARDS constant must be declared as `false`",
);
mkdirSync(join(variantRoot, "rules"));
mkdirSync(join(variantRoot, "shared"));
writeFileSync(join(variantRoot, "rules", "no-runtime-typeof.ts"), flipped);
for (const shared of ["report.ts", "syntax.ts"]) {
	writeFileSync(
		join(variantRoot, "shared", shared),
		readFileSync(
			fileURLToPath(new URL(`../shared/${shared}`, import.meta.url)),
			"utf8",
		),
	);
}

run(
	"noRuntimeTypeof",
	pathToFileURL(join(variantRoot, "rules", "no-runtime-typeof.ts")),
	{
		valid: [
			{ name: "allowInTypeGuards: function type guard", code: typeGuard },
			{ name: "allowInTypeGuards: arrow type guard", code: arrowTypeGuard },
			{ name: "allowInTypeGuards: assertion signature", code: assertion },
			{ name: "allowInTypeGuards: method type guard", code: methodTypeGuard },
			{
				name: "allowInTypeGuards: exported default type guard",
				code: 'export default function (value: unknown): value is string { return typeof value === "string"; }',
			},
			{
				name: "allowInTypeGuards: existence probe",
				code: 'const isServer = typeof document === "undefined";',
			},
		],
		invalid: [
			{
				name: "allowInTypeGuards: non-guard function",
				code: nonGuard,
				errors: [error],
			},
			{
				name: "allowInTypeGuards: nested callback inside a guard",
				code: nestedInGuard,
				errors: [error],
			},
			{
				name: "allowInTypeGuards: top level",
				code: 'if (typeof input === "string") use(input);',
				errors: [error],
			},
			{
				name: "allowInTypeGuards: getter is not a guard",
				code: 'class Box { get isText() { return typeof this.value === "string"; } }',
				errors: [error],
			},
		],
	},
);
