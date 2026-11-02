import { run } from "../../test/rule-tester.ts";

const message = "exposes `unknown` to its caller";

run("noUnknownReturns", new URL("./no-unknown-returns.ts", import.meta.url), {
	valid: [
		"type ImportedValue = unknown;",
		"function parse(): ImportedValue { return input; }",
		"function parse(): User { return user; }",
		"function infer() { return input; }",
		"function generic<Value>(): Value { return value; }",
		"type Value = unknown; function generic<Value>(): Value { return value; }",
		"type Key = unknown; type Mapped<Input> = { [Key in keyof Input]: () => Key };",
		"type Item = unknown; type Unpacked<Input> = Input extends Promise<infer Item> ? () => Item : never;",
		"function cause(): { cause: unknown } { return { cause: input }; }",
		"type Result = { value: unknown }; function load(): Result { return result; }",
		"function load(): Promise<User> { return promise; }",
		"type Identity<T> = T; function load(): Identity<User> { return user; }",
		"type Value = unknown; function outer() { type Value = User; function load(): Value { return user; } }",
		// Biome-specific coverage.
		{
			name: "type predicate",
			code: "function isUser(value: unknown): value is User { return true; }",
		},
		{
			name: "assertion signature",
			code: "function assertUser(value: unknown): asserts value is User {}",
		},
		{
			name: "unknown parameters are out of scope",
			code: "function load(value: unknown): User { return user; }",
		},
		{
			name: "unknown array",
			code: "function load(): unknown[] { return []; }",
		},
		{
			name: "imported alias is not resolved",
			code: "import type { Raw } from './raw'; function load(): Raw { return raw; }",
		},
		{
			name: "block-scoped alias does not leak",
			code: "function one() { type Raw = unknown; } function two(): Raw { return raw; }",
		},
		{
			name: "constructor has no return contract",
			code: "class C { constructor() {} }",
		},
	],
	invalid: [
		{
			code: "function load(): unknown { return input; }",
			errors: [{ message, line: 1 }],
		},
		{ code: "const load = (): unknown => input;", errors: [{ message }] },
		{ code: "type Loader = () => unknown;", errors: [{ message }] },
		{ code: "interface Loader { load(): unknown }", errors: [{ message }] },
		{ code: "declare function load(): unknown;", errors: [{ message }] },
		{
			code: "function load(): string | unknown { return input; }",
			errors: [{ message }],
		},
		{
			code: "function load(): Promise<unknown> { return promise; }",
			errors: [{ message }],
		},
		{
			code: "type UnknownValue = unknown; function load(): UnknownValue { return input; }",
			errors: [{ message }],
		},
		{
			code: "type Item = unknown; type Fallback<Input> = Input extends infer Item ? string : () => Item;",
			errors: [{ message }],
		},
		{
			code: "function outer() { type Result = unknown; function load(): Result { return input; } }",
			errors: [{ message }],
		},
		{
			code: "type Identity<T> = T; function load(): Identity<unknown> { return input; }",
			errors: [{ message }],
		},
		{
			code: "type Identity<T> = T; type Wrapped<T> = Promise<Identity<T>>; function load(): Wrapped<unknown> { return promise; }",
			errors: [{ message }],
		},
		// Biome-specific coverage.
		{
			name: "PromiseLike",
			code: "function load(): PromiseLike<unknown> { return promise; }",
			errors: 1,
		},
		{
			name: "async method",
			code: "class Store { async load(): Promise<unknown> { return input; } }",
			errors: 1,
		},
		{
			name: "getters",
			code: "class C { get value(): unknown { return input; } } interface I { get value(): unknown } const o = { get value(): unknown { return input; } };",
			errors: 3,
		},
		{
			name: "call, construct, and constructor types",
			code: "interface I { (): unknown; new (): unknown } type C = new () => unknown;",
			errors: 3,
		},
		{
			name: "abstract method",
			code: "abstract class C { abstract load(): unknown; }",
			errors: 1,
		},
		{
			name: "forward reference to a block-scoped alias",
			code: "function outer() { function load(): Result { return input; } type Result = unknown; }",
			errors: 1,
		},
		{
			name: "default type argument",
			code: "type Box<T = unknown> = T; function load(): Box { return input; }",
			errors: 1,
		},
	],
});
