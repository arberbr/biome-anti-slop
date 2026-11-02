import { run } from "../../test/rule-tester.ts";

const message = "hides `unknown`";

run(
	"noUnknownTypeAliases",
	new URL("./no-unknown-type-aliases.ts", import.meta.url),
	{
		valid: [
			"type User = { readonly id: string };",
			"type Alias = string; type UserId = Alias;",
			"type Payload = string | number;",
			"type Box<T> = { readonly value: T }; type Payload = Box<unknown>;",
			// Biome-specific coverage.
			{ name: "unknown array", code: "type Payloads = unknown[];" },
			{ name: "generic parameter alone", code: "type Identity<T> = T;" },
			{
				name: "imported alias is not resolved",
				code: "import type { Raw } from './raw'; type Payload = Raw;",
			},
			{ name: "self-referencing alias terminates", code: "type Loop = Loop;" },
		],
		invalid: [
			{
				code: "type Alias = unknown;",
				errors: [{ message: "Type alias `Alias` hides", line: 1 }],
			},
			{ code: "type Current = unknown;", errors: [{ message }] },
			{
				code: "type UnknownValue = unknown; type Alias = UnknownValue;",
				errors: [{ message: "`UnknownValue`" }, { message: "`Alias`" }],
			},
			{ code: "type Payload = string | unknown;", errors: [{ message }] },
			{
				code: "type Payload = string | unknown; type NestedPayload = number | Payload;",
				errors: [{ message }, { message }],
			},
			{
				code: "type Identity<T> = T; type Payload = Identity<unknown>;",
				errors: [{ message: "`Payload`" }],
			},
			{
				code: "type Identity<T> = T; type Wrapped<T> = Identity<T>; type Payload = Wrapped<unknown>;",
				errors: [{ message: "`Payload`" }],
			},
			{
				code: "function outer() { type Payload = unknown; }",
				errors: [{ message }],
			},
			// Biome-specific coverage.
			{
				name: "forward reference",
				code: "type Alias = Later;\ntype Later = (unknown);",
				errors: [
					{ message: "`Alias`", line: 1 },
					{ message: "`Later`", line: 2 },
				],
			},
			{
				name: "shadowed alias resolves to the nearer declaration",
				code: "type Payload = unknown;\nfunction outer() { type Payload = string; type Local = Payload; }",
				errors: [{ message: "`Payload`", line: 1 }],
			},
			{
				name: "exported alias",
				code: "export type Payload = unknown;",
				errors: 1,
			},
			{
				name: "default type argument",
				code: "type Box<T = unknown> = T; type Payload = Box;",
				errors: [{ message: "`Payload`" }],
			},
		],
	},
);
