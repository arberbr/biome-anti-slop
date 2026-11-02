import { run } from "../../test/rule-tester.ts";

const message = "uses the broad `object` type";

run(
	"noObjectParameters",
	new URL("./no-object-parameters.ts", import.meta.url),
	{
		valid: [
			"type Alias = object;",
			"function f(value: Alias) {}",
			"interface Owner { readonly id: string } function f(value: Owner) {}",
			"function f<Value>(value: Value) {}",
			"function f<Value extends object>(value: Value) {}",
			"function f<Value extends Owner, Owner extends { readonly id: string }>(value: Value) {}",
			"type Owner = { readonly id: string }; function f<Value extends Owner>(value: Value) {}",
			"type Alias = object; function consume<Alias>(value: Alias) {}",
			"type Alias = object; type Consumer<Alias> = (value: Alias) => void;",
			"type Alias = object; interface Consumer<Alias> { consume(value: Alias): void }",
			"type Key = object; type Mapped<Input> = { [Key in keyof Input]: (value: Key) => void };",
			"type Item = object; type Unpacked<Input> = Input extends Promise<infer Item> ? (value: Item) => void : never;",
			"type Payload = object; function outer() { type Payload = { readonly id: string }; function consume(value: Payload) {} }",
			"type Identity<T> = T; function consume<Identity>(value: Identity) {}",
			"function one() { type Payload = object; } function two() { function consume(value: Payload) {} }",
			// Biome-specific coverage.
			{
				name: "object return types are out of scope",
				code: "function f(): object { return {}; }",
			},
			{
				name: "untyped arrow parameter",
				code: "const f = value => value;",
				filename: "input.js",
			},
			{
				name: "array of object is not object",
				code: "function f(values: object[]) {}",
			},
			{
				name: "imported name is not resolved",
				code: "import type { Bag } from './bag'; function f(value: Bag) {}",
			},
			{
				name: "qualified name is not resolved",
				code: "function f(value: NS.Bag) {}",
			},
			{
				name: "self-referencing alias terminates",
				code: "type Loop = Loop | string; function f(value: Loop) {}",
			},
		],
		invalid: [
			{ code: "function f(value: object) {}", errors: [{ message, line: 1 }] },
			{
				code: "type Alias = object; function f(value: Alias) {}",
				errors: [{ message }],
			},
			{
				code: "type Alias = (object); function f(value: Alias) {}",
				errors: [{ message }],
			},
			{
				code: "type Item = object; type Fallback<Input> = Input extends infer Item ? string : (value: Item) => void;",
				errors: [{ message }],
			},
			{
				code: "function consume(value: object = {}): void {}",
				errors: [{ message: "Parameter `value` uses" }],
			},
			{
				code: "function consume({ value }: object = {}): void {}",
				errors: [{ message: "Parameter `{ value }` uses" }],
			},
			{
				code: "type Bag = object; function consume({ value }: Bag): void {}",
				errors: [{ message: "Parameter `{ value }` uses" }],
			},
			{
				code: "function outer() { type Payload = object; function consume(value: Payload) {} }",
				errors: [{ message }],
			},
			{
				code: "function outer() { function consume(value: Payload) {} type Payload = object; }",
				errors: [{ message }],
			},
			{
				code: "type Identity<T> = T; function consume(value: Identity<object>) {}",
				errors: [{ message }],
			},
			{
				code: "type Identity<T> = T; type Wrapped<T> = Identity<T>; function consume(value: Wrapped<object>) {}",
				errors: [{ message }],
			},
			// Biome-specific coverage of every function-like node kind.
			{
				name: "union containing object",
				code: "function f(value: string | object) {}",
				errors: 1,
			},
			{
				name: "arrow function",
				code: "const f = (value: object) => value;",
				errors: 1,
			},
			{
				name: "function expression",
				code: "const f = function (value: object) {};",
				errors: 1,
			},
			{
				name: "export default function",
				code: "export default function (value: object) {}",
				errors: 1,
			},
			{
				name: "declare function",
				code: "declare function f(value: object): void;",
				errors: 1,
			},
			{
				name: "class members",
				code: "class C { constructor(private readonly value: object) {} method(value: object) {} set value(next: object) {} }",
				errors: [
					{ message: "Parameter `value`" },
					{ message: "Parameter `value`" },
					{ message: "Parameter `next`" },
				],
			},
			{
				name: "abstract and overload signatures",
				code: "abstract class C { abstract run(value: object): void; load(value: object): void; load(value: unknown) {} }",
				errors: 2,
			},
			{
				name: "object literal methods",
				code: "const owner = { method(value: object) {}, set value(next: object) {} };",
				errors: 2,
			},
			{
				name: "interface and type literal signatures",
				code: "interface I { (value: object): void; new (value: object): I; method(value: object): void; set value(next: object); }",
				errors: 4,
			},
			{
				name: "function and constructor types",
				code: "type F = (value: object) => void; type C = new (value: object) => F;",
				errors: 2,
			},
			{
				name: "rest parameter",
				code: "function f(...values: object) {}",
				errors: [{ message: "Parameter `values`" }],
			},
			{
				name: "this parameter",
				code: "function f(this: object) {}",
				errors: [{ message: "Parameter `this`" }],
			},
			{
				name: "block-scoped alias in a switch case",
				code: "switch (kind) { case 1: { type Bag = object; const f = (value: Bag) => value; } }",
				errors: 1,
			},
		],
	},
);
