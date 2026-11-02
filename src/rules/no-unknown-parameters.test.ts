import { run } from "../../test/rule-tester.ts";

const message = "leaves input unparsed";

run(
	"noUnknownParameters",
	new URL("./no-unknown-parameters.ts", import.meta.url),
	{
		valid: [
			"function enrich(cause: unknown): void {}",
			"function enrich(cause: Error | unknown): void {}",
			"function isString(value: unknown): value is string { return true; }",
			"const isString = (value: unknown): value is string => true;",
			"function assertString(value: unknown): asserts value is string {}",
			"type Guard = (value: unknown) => value is string;",
			"declare function isString(value: unknown): value is string;",
			"type Guards = { isString(value: unknown): value is string };",
			"function parse(value: string | number): void {}",
			// Biome-specific coverage.
			{
				name: "bare assertion signature",
				code: "function assertDefined(value: unknown): asserts value {}",
			},
			{
				name: "class method type predicate",
				code: "class Guards { isString(value: unknown): value is string { return true; } }",
			},
			{
				name: "aliases are not resolved",
				code: "type Input = unknown; function parse(value: Input): void {}",
			},
			{
				name: "unknown nested in a container",
				code: "function parse(values: unknown[]): void {}",
			},
			{
				name: "unknown return is out of scope",
				code: "function load(): unknown { return input; }",
			},
		],
		invalid: [
			{
				code: "function parse(value: unknown): void {}",
				errors: [{ message, line: 1 }],
			},
			{
				code: "function parse(value: string | unknown): void {}",
				errors: [{ message }],
			},
			{
				code: "function parse(value: string | (number | unknown)): void {}",
				errors: [{ message }],
			},
			{
				code: "function isString(value: unknown, context: unknown): value is string { return true; }",
				errors: [{ message: "Parameter `context` leaves" }],
			},
			{
				code: "export function parse({ value }: unknown = {}): void {}",
				errors: [{ message: "Parameter `{ value }` leaves" }],
			},
			// Biome-specific coverage.
			{
				name: "predicate subject on another parameter",
				code: "function isString(value: unknown, other: unknown): other is string { return true; }",
				errors: [{ message: "Parameter `value` leaves" }],
			},
			{
				name: "arrow function",
				code: "const parse = (value: unknown) => value;",
				errors: 1,
			},
			{
				name: "constructor property and setter",
				code: "class C { constructor(public value: unknown) {} set next(value: unknown) {} }",
				errors: 2,
			},
			{
				name: "interface signatures",
				code: "interface I { (value: unknown): void; method(value: unknown): void; set value(next: unknown); }",
				errors: 3,
			},
			{
				name: "rest parameter",
				code: "function f(...values: unknown) {}",
				errors: [{ message: "Parameter `values`" }],
			},
			{
				name: "multiline",
				code: "function parse(\n\tvalue: unknown,\n): void {}",
				errors: [{ line: 2 }],
			},
		],
	},
);
