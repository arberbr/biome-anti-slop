import { run } from "../../test/rule-tester.ts";

const error = {
	message: "discards type evidence and later recreates it with an assertion",
};

run(
	"noWidenThenAssert",
	new URL("./no-widen-then-assert.ts", import.meta.url),
	{
		valid: [
			"const source = { id: 'first' }; const widened: unknown = source;",
			"declare const input: unknown; const parsed = input as { readonly id: string };",
			// Biome-specific coverage.
			{
				name: "boundary input is not known evidence",
				code: "declare function load(): unknown; const widened: unknown = load(); const parsed = widened as { readonly id: string };",
			},
			{
				name: "let binding may be reassigned",
				code: "let widened: unknown = { id: 1 }; const parsed = widened as { id: number };",
			},
			{
				name: "reassigned binding",
				code: "let widened: unknown = { id: 1 }; widened = load(); const parsed = widened as { id: number };",
			},
			{
				name: "assertion to another broad type",
				code: "const widened: unknown = { id: 1 }; const parsed = widened as object;",
			},
			{
				name: "assertion in a nested function",
				code: "const widened: unknown = { id: 1 }; const read = () => widened as { id: number };",
			},
			{
				name: "known value from an outer function",
				code: "const source = { id: 1 }; function f() { const widened: unknown = source; return widened as { id: number }; }",
			},
			{
				name: "annotated parameter of an outer function",
				code: "function f(source: string) { const g = () => { const widened: unknown = source; return widened as string; }; }",
			},
			{
				name: "assertion before the declaration",
				code: "class Box { value = widened as { id: number }; } const widened: unknown = { id: 1 };",
			},
			{
				name: "assertion inside the initializer",
				code: "const widened: unknown = [widened as string];",
			},
			{
				name: "broadly annotated source",
				code: "declare const source: Record<string, unknown>; const widened: unknown = source; const parsed = widened as { id: number };",
			},
			{
				name: "object widening asserted to a primitive",
				code: "const widened: object = { id: 1 }; const parsed = widened as string;",
			},
			{
				name: "record widening asserted to an index-only literal",
				code: "const widened: Record<string, unknown> = { id: 1 }; const parsed = widened as { [key: string]: number };",
			},
			{
				name: "record widening asserted to an unknown record",
				code: "const widened: Readonly<Record<string, unknown>> = { id: 1 }; const parsed = widened as Record<string, any>;",
			},
			{
				name: "narrow annotation is not a widening",
				code: "const widened: { id: number } = { id: 1 }; const parsed = widened as { id: 1 };",
			},
			{
				name: "finite-key record is not broad",
				code: "const widened: Record<'id', unknown> = { id: 1 }; const parsed = widened as { id: number };",
			},
			{
				name: "tagged template is not known",
				code: "const widened: unknown = tag`x`; const parsed = widened as string;",
			},
			{
				name: "self-referencing aliases terminate",
				code: "const a = b; const b = a; const widened: unknown = a; const parsed = widened as string;",
			},
		],
		invalid: [
			{
				code: "const source = { id: 'second' }; const widened: unknown = source; const parsed = widened as { readonly id: string };",
				errors: [error],
			},
			{
				// Upstream follows any variable declarator, so a destructured name
				// carries its whole initializer as evidence.
				name: "destructured object source is followed",
				code: "const { source } = { source: { id: 1 } }; const widened: unknown = source; const parsed = widened as { id: number };",
				errors: [error],
			},
			{
				name: "destructured array source is followed",
				code: "const [first] = [1, 2]; const widened: unknown = first; const parsed = widened as number;",
				errors: [error],
			},
			// Biome-specific coverage.
			{
				name: "full message",
				code: "const widened: unknown = 1; const parsed = widened as number;",
				errors: [
					{
						message:
							'Binding "widened" discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once. [anti-slop/noWidenThenAssert]',
					},
				],
			},
			{
				name: "README example",
				code: "declare function loadUser(): User;\nconst loaded: User = loadUser();\nconst stored: unknown = loaded;\nconst user = stored as User;",
				errors: [{ ...error, line: 4 }],
			},
			{
				name: "any widening",
				code: "const widened: any = [1]; const parsed = widened as number[];",
				errors: [error],
			},
			{
				name: "widening through an initializer assertion",
				code: "const source = { id: 1 }; const widened = source as unknown; const parsed = widened as { id: number };",
				errors: [error],
			},
			{
				name: "parenthesized initializer assertion",
				code: "const widened = ({ id: 1 } as unknown); const parsed = (widened) as { id: number };",
				errors: [error],
			},
			{
				name: "angle-bracket assertion",
				code: "const widened: unknown = 'text'; const parsed = <string>widened;",
				errors: [error],
			},
			{
				name: "narrow initializer assertion is evidence",
				code: "declare const input: string; const widened: unknown = input as 'a'; const parsed = widened as 'a';",
				errors: [error],
			},
			{
				name: "object widening asserted to an object type",
				code: "const widened: object = { id: 1 }; const a = widened as { id: number }; const b = widened as number[]; const c = widened as readonly [number]; const d = widened as () => void;",
				errors: 4,
			},
			{
				name: "object widening asserted back to the same syntax",
				code: "type Id = { id: number }; declare const source: Id; const widened: object = source; const parsed = widened as Id;",
				errors: [error],
			},
			{
				name: "object widening asserted to an intersection of object types",
				code: "const widened: object = { id: 1 }; const parsed = widened as { id: number } & { name?: string };",
				errors: [error],
			},
			{
				name: "record widening asserted to a narrower literal",
				code: "const widened: Record<string, unknown> = { id: 1 }; const parsed = widened as { id: number };",
				errors: [error],
			},
			{
				name: "record widening asserted to a concrete record",
				code: "const widened: Record<PropertyKey, unknown> = { id: 1 }; const parsed = widened as Readonly<Record<string, number>>;",
				errors: [error],
			},
			{
				name: "index-signature record widening",
				code: "const widened: { [key: string]: unknown } = { id: 1 }; const parsed = widened as { id: number };",
				errors: [error],
			},
			{
				name: "inside one function",
				code: "function f(source: string) { const widened: unknown = source; return widened as string; }",
				errors: [error],
			},
			{
				name: "inside a class method",
				code: "class Box { read(source: number[]) { const widened: unknown = source; return widened as number[]; } }",
				errors: [error],
			},
			{
				name: "const alias chain",
				code: "const first = [1]; const second = first; const widened: unknown = second; const parsed = widened as number[];",
				errors: [error],
			},
			{
				name: "exported declarations",
				code: "export const widened: unknown = { id: 1 }; export const parsed = widened as { id: number };",
				errors: [error],
			},
			{
				name: "class field initializer after the declaration",
				code: "const widened: unknown = { id: 1 }; class Box { value = widened as { id: number }; }",
				errors: [error],
			},
			{
				name: "nested assertion reports the inner widened use",
				code: "const widened: unknown = { id: 1 }; const parsed = (widened as { id: number }) as { id: 1 };",
				errors: 1,
			},
		],
	},
);
