import { run } from "../../test/rule-tester.ts";

const error = { message: "discards known type evidence" };

const prelude = "type Command = () => void; const startCommand = () => {};";

run(
	"noKnownValueWidening",
	new URL("./no-known-value-widening.ts", import.meta.url),
	{
		valid: [
			`${prelude} const commands: Record<string, Command> = {};`,
			`${prelude} type Index<T> = Record<string, T>; const commands: Index<Command> = {};`,
			`${prelude} class Registry { commands: Record<string, Command> = {}; }`,
			`${prelude} class Registry { accessor commands: Record<string, Command> = {}; }`,
			`${prelude} let commands: Record<string, Command>; commands = {};`,
			`${prelude} function create(): Record<string, Command> { return {}; }`,
			`${prelude} const create = (): Record<string, Command> => ({});`,
			`${prelude} const commands = {} as Record<string, Command>;`,
			`${prelude} const commands = <Record<string, Command>>{};`,
			`${prelude} const commands = { start: startCommand };`,
			`${prelude} const commands = { start: startCommand } as const;`,
			`${prelude} const commands = { start: startCommand } satisfies Record<string, Command>;`,
			`${prelude} type Commands = Record<string, Command>; const commands = { start: startCommand } as const satisfies Commands;`,
			`${prelude} interface Commands { readonly start: Command } const commands: Commands = { start: startCommand };`,
			`${prelude} type Commands = { readonly start: Command }; const commands: Commands = { start: startCommand };`,
			`${prelude} type PermissionLevels = { readonly [Level in Permission]: number }; const levels: PermissionLevels = { admin: 1 };`,
			`${prelude} function create() { return { start: startCommand }; }`,
			`${prelude} interface Commands { readonly start: Command } function create(): Commands { return { start: startCommand }; }`,
			`${prelude} declare function make(): Record<string, Command>; const commands: Record<string, Command> = make();`,
			`${prelude} import { Commands } from './types'; const commands: Commands = { start: startCommand };`,
			`${prelude} type Diet = 'vegan' | 'omnivore'; const labels: Record<Diet, string> = { vegan: 'V', omnivore: 'O' };`,
			`${prelude} type Diet = 'vegan' | 'omnivore'; type Labels = Record<Diet, string>; const labels: Labels = { vegan: 'V', omnivore: 'O' };`,
			`${prelude} type Diet = 'vegan' | 'omnivore'; const labels: Readonly<Record<Diet, string>> = { vegan: 'V', omnivore: 'O' };`,
			`${prelude} const labels: Record<'a' | 'b', number> = { a: 1, b: 2 };`,
			`${prelude} type Index<Key extends PropertyKey, Value> = Record<Key, Value>; const commands: Index<'start', Command> = { start: startCommand };`,
			"function isString(value: unknown): value is string { return true; } declare const input: unknown; isString(input);",
			"function isString(value: string | unknown): value is string { return true; } declare const input: string | unknown; isString(input);",
			"function isString(value: unknown): value is string { return true; } declare function readInput(): unknown; isString(readInput());",
			// Biome-specific coverage.
			{
				name: "reassigned alias is not evidence",
				code: "let source = { id: 1 }; source = load(); const value: unknown = source;",
			},
			{
				name: "let alias is not evidence",
				code: "let source = { id: 1 }; const value: unknown = source;",
			},
			{
				name: "parameter is not literal evidence",
				code: "function f(source: { id: number }) { const value: unknown = source; }",
			},
			{
				name: "unresolved global is not evidence",
				code: "const value: unknown = input;",
			},
			{
				name: "parenthesized empty dictionary accumulator",
				code: `${prelude} const commands: Record<string, Command> = ({});`,
			},
			{
				name: "empty dictionary accumulator behind satisfies",
				code: `${prelude} const commands: Record<string, Command> = {} satisfies object;`,
			},
			{
				name: "shadowed Record is not a built-in",
				code: "type Record<K, V> = Map<K, V>; const commands: Record<string, number> = new Map();",
			},
			{
				name: "predicate on a non-unknown parameter",
				code: "function isString(value: string | number): value is string { return true; } isString('known');",
			},
			{
				name: "predicate on a member call is not resolved",
				code: "declare const guards: { isString(value: unknown): value is string }; guards.isString('known');",
			},
			{
				name: "this predicate has no argument",
				code: "class Box { isString(this: unknown): this is string { return true; } }",
			},
			{
				name: "this parameter does not shift the predicate argument",
				code: "function isString(this: Window, value: unknown): value is string { return true; } declare const input: unknown; isString(input);",
			},
			{
				name: "spread argument",
				code: "function isString(value: unknown): value is string { return true; } declare const args: [unknown]; isString(...args);",
			},
			{
				name: "overloaded function names are not resolved",
				code: "function isString(value: unknown): value is string; function isString(value: unknown): boolean { return true; } isString('known');",
			},
			{
				name: "overloads with predicates are not resolved",
				code: "function isString(value: unknown): value is string; function isString(value: unknown): value is string { return true; } isString('known');",
			},
			{
				name: "self-referencing aliases terminate",
				code: "const a = b; const b = a; const value: unknown = a; function isString(value: unknown): value is string { return true; } isString(a);",
			},
			{
				name: "unknown-asserted argument",
				code: "function isString(value: unknown): value is string { return true; } isString(load() as unknown);",
			},
			{
				name: "destructured declarator",
				code: "const { value }: { value: unknown } = { value: 1 };",
			},
			{
				name: "compound assignment",
				code: "let total: object; total += {};",
			},
			{
				name: "satisfies is not a widening flow",
				code: "const value = { id: 1 } satisfies object;",
			},
			{
				name: "tagged template is not evidence",
				code: "const value: unknown = tag`text`;",
			},
			{
				name: "return outside a function",
				code: "const f = () => { function inner() {} return; };",
			},
			{
				name: "union target is not classified",
				code: "const value: readonly unknown[] | unknown = [];",
			},
			{
				name: "type predicate return contract is not a widening target",
				code: "function isString(value: unknown): value is string { return {} as never; }",
			},
		],
		invalid: [
			{
				// Upstream follows a destructured name to its declarator's initializer.
				name: "destructured call result passed to a local unknown predicate",
				code: "interface H { alg: string }\nfunction decode(t: string): { header: H } { return { header: { alg: t } }; }\nfunction isTokenHeader(value: unknown): value is H { return value !== null; }\nconst { header } = decode('x');\nisTokenHeader(header);",
				errors: [{ line: 2 }, { line: 5 }],
			},
			{ code: "const value: unknown = {};", errors: [error] },
			{ code: "const value: object = {};", errors: [error] },
			{ code: "let value: unknown; value = {};", errors: [error] },
			{ code: "function create(): unknown { return {}; }", errors: [error] },
			{
				code: `${prelude} const commands: Record<string, Command> = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} const commands: { [key: string]: Command } = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} const commands: { [K in string]: Command } = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} const commands: { start: Command } = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} const commands = { start: startCommand } as Record<string, Command>;`,
				errors: [error],
			},
			{
				code: `${prelude} const commands = ({ start: startCommand } as Record<string, Command>) as object;`,
				errors: 1,
			},
			{
				code: `${prelude} class Registry { commands: Record<string, Command> = { start: startCommand }; }`,
				errors: [error],
			},
			{
				code: `${prelude} let commands: Record<string, Command>; commands = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} function create(): Record<string, Command> { return { start: startCommand }; }`,
				errors: [error],
			},
			{
				code: `${prelude} function create(): { start: Command } { return { start: startCommand }; }`,
				errors: [error],
			},
			{
				code: `${prelude} const source = { start: startCommand }; const commands: Record<string, Command> = source;`,
				errors: [error],
			},
			{
				code: `${prelude} type Open = Record<string, Command>; const source = { start: startCommand }; const commands: Open = source;`,
				errors: [error],
			},
			{
				code: `${prelude} type Open = { [key: string]: Command }; const source = { start: startCommand }; const commands: Open = source;`,
				errors: [error],
			},
			{
				code: `${prelude} type Open = { [key in string]: Command }; const source = { start: startCommand }; const commands: Open = source;`,
				errors: [error],
			},
			{
				code: `${prelude} type Open = Readonly<Record<string, Command>>; const source = { start: startCommand }; const commands: Open = source;`,
				errors: [error],
			},
			{
				code: `${prelude} function outer() { type Open = Record<string, Command>; const commands: Open = { start: startCommand }; }`,
				errors: [error],
			},
			{
				code: `${prelude} type Index<T> = Record<string, T>; const commands: Index<Command> = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} type Identity<T> = T; const commands: Identity<Record<string, Command>> = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} type Index<T> = Record<string, T>; type CommandsByName = Index<Command>; const commands: CommandsByName = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} type Index<T = Command> = Record<string, T>; const commands: Index = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} type Key = string; const commands: Record<Key, Command> = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} const commands: Record<PropertyKey, Command> = { start: startCommand };`,
				errors: [error],
			},
			{
				code: `${prelude} const commands: Record<string | 'start', Command> = { start: startCommand };`,
				errors: [error],
			},
			{ code: "const value: unknown = 1;", errors: [error] },
			{ code: "const value: object = [];", errors: [error] },
			{
				code: "function isString(value: unknown): value is string { return true; } isString('known');",
				errors: [error],
			},
			{
				code: "function isString(value: unknown): value is string { return true; } const known = 'known'; isString(known);",
				errors: [error],
			},
			{
				code: "function isString(value: string | unknown): value is string { return true; } isString('known');",
				errors: [error],
			},
			{
				code: "function isString(value: unknown): value is string { return true; } function check(known: string): boolean { return isString(known); }",
				errors: [error],
			},
			{
				code: "const isString = (value: unknown): value is string => true; const known: string = getValue(); isString(known);",
				errors: [error],
			},
			{
				code: "type User = { readonly id: string }; function isUser(value: unknown): value is User { return true; } function parse(): User { return { id: 'known' }; } const user = parse(); isUser(user);",
				errors: [error],
			},
			// Biome-specific coverage.
			{
				name: "message names the target kind and binding",
				code: "const value: unknown = {};",
				errors: [
					{
						message:
							"The explicit unknown type on binding `value` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract. [anti-slop/noKnownValueWidening]",
					},
				],
			},
			{
				name: "open dictionary target kind",
				code: `${prelude} const commands: Record<string, Command> = { start: startCommand };`,
				errors: [
					{ message: "explicit open dictionary type on binding `commands`" },
				],
			},
			{
				name: "anonymous object target kind",
				code: `${prelude} const commands: { start: Command } = { start: startCommand };`,
				errors: [{ message: "explicit anonymous object type" }],
			},
			{
				name: "generic container target kind",
				code: `${prelude} type Index<T> = Record<string, T>; const commands: Index<Command> = { start: startCommand };`,
				errors: [{ message: "explicit generic container type" }],
			},
			{
				name: "object target kind on an assertion",
				code: "const value = [] as object;",
				errors: [{ message: "explicit object type on assertion" }],
			},
			{
				name: "predicate argument message",
				code: "function isString(value: unknown): value is string { return true; } isString('known');",
				errors: [
					{
						message:
							"explicit unknown type on argument for parameter `value` of `isString`",
					},
				],
			},
			{
				name: "return value message names the function",
				code: "function create(): unknown { return {}; }",
				errors: [{ message: "on return value of `create`" }],
			},
			{
				name: "arrow return value message names the variable",
				code: "const create = (): object => [];",
				errors: [{ message: "on return value of `create`" }],
			},
			{
				name: "class method return",
				code: "class Factory { create(): unknown { return {}; } }",
				errors: [{ message: "on return value of `create`" }],
			},
			{
				name: "object method return",
				code: "const factory = { create(): object { return []; } };",
				errors: [{ message: "on return value of `create`" }],
			},
			{
				name: "getter return",
				code: "class Factory { get value(): unknown { return 1; } }",
				errors: [{ message: "on return value of `value`" }],
			},
			{
				name: "export default function return",
				code: "export default function (): unknown { return {}; }",
				errors: [{ message: "on return value of `anonymous function`" }],
			},
			{
				name: "nested arrow return uses the nearest function",
				code: "function outer(): void { const inner = (): unknown => { return {}; }; }",
				errors: [{ message: "on return value of `inner`" }],
			},
			{
				name: "parenthesized arrow body",
				code: "const create = (): unknown => ({ id: 1 });",
				errors: [error],
			},
			{
				name: "property message names the member",
				code: "class Registry { private items: object = []; }",
				errors: [{ message: "on property `items`" }],
			},
			{
				name: "string-literal class property name",
				code: "class Registry { 'items': object = []; }",
				errors: [{ message: "on property `items`" }],
			},
			{
				name: "private class property name",
				code: "class Registry { #items: object = []; }",
				errors: [{ message: "on property `items`" }],
			},
			{
				name: "optional class property",
				code: "class Registry { items?: unknown = []; }",
				errors: [error],
			},
			{
				name: "static class property",
				code: "class Registry { static items: unknown = []; }",
				errors: [error],
			},
			{
				name: "exported const",
				code: "export const value: unknown = { id: 1 };",
				errors: [error],
			},
			{
				name: "parenthesized assignment target",
				code: "let value: unknown; (value) = {};",
				errors: [error],
			},
			{
				name: "alias chain to a literal",
				code: "const first = { id: 1 }; const second = first; const value: unknown = second;",
				errors: [{ message: "binding `value`" }],
			},
			{
				name: "alias through an assertion and parentheses",
				code: "const source = { id: 1 }; const value: unknown = (source!);",
				errors: [error],
			},
			{
				name: "unary, template, and new evidence",
				code: "const a: unknown = -1; const b: unknown = `text`; const c: object = new Map();",
				errors: 3,
			},
			{
				name: "function and class evidence",
				code: "const a: unknown = function () {}; const b: object = class {};",
				errors: 2,
			},
			{
				name: "angle-bracket assertion",
				code: "const value = <unknown>{ id: 1 };",
				errors: [{ message: "on assertion" }],
			},
			{
				name: "chained parenthesized angle-bracket assertions report once",
				code: "const value = <object>(<unknown>{ id: 1 });",
				errors: 1,
			},
			{
				name: "arrow predicate argument",
				code: "const isString = (value: unknown): value is string => true; isString(1);",
				errors: [
					{
						message: "argument for parameter `value` of `isString`",
					},
				],
			},
			{
				name: "function expression predicate",
				code: "const isString = function (value: unknown): value is string { return true; }; isString(1);",
				errors: [{ message: "of `isString`" }],
			},
			{
				name: "asserts signature",
				code: "function assertString(value: unknown): asserts value is string {} assertString('known');",
				errors: [{ message: "of `assertString`" }],
			},
			{
				name: "declare function predicate",
				code: "declare function isString(value: unknown): value is string; isString('known');",
				errors: [error],
			},
			{
				name: "exported predicate",
				code: "export function isString(value: unknown): value is string { return true; } isString('known');",
				errors: [error],
			},
			{
				name: "second-parameter predicate",
				code: "function isString(label: string, value: unknown): value is string { return true; } isString('label', { id: 1 });",
				errors: [{ message: "argument for parameter `value`" }],
			},
			{
				name: "this parameter does not shift the predicate argument",
				code: "function isString(this: Window, value: unknown): value is string { return true; } isString({ id: 1 });",
				errors: [error],
			},
			{
				name: "inline predicate",
				code: "((value: unknown): value is string => true)('known');",
				errors: [{ message: "of `anonymous function`" }],
			},
			{
				name: "informative assertion argument",
				code: "function isString(value: unknown): value is string { return true; } isString(load() as Date);",
				errors: [error],
			},
			{
				name: "satisfies argument",
				code: "function isString(value: unknown): value is string { return true; } isString({ id: 1 } satisfies object);",
				errors: [error],
			},
			{
				name: "call to a predicate is informative",
				code: "function isString(value: unknown): value is string { return true; } declare function check(value: string): value is 'a'; declare const input: string; isString(check(input));",
				errors: [error],
			},
			{
				name: "const alias to an annotated call argument",
				code: "function isString(value: unknown): value is string { return true; } declare const input: Date; const alias = input; isString(alias);",
				errors: [error],
			},
			{
				name: "definite annotation of a call argument",
				code: "function isString(value: unknown): value is string { return true; } let input!: Date; isString(input);",
				errors: [error],
			},
			{
				name: "rest parameter annotation of a call argument",
				code: "function isString(value: unknown): value is string { return true; } function check(...values: string[]) { isString(values); }",
				errors: [error],
			},
			{
				name: "type-literal parameter annotation",
				code: "function isString(value: unknown): value is string { return true; } function check(known: { id: string }) { isString(known); }",
				errors: [error],
			},
		],
	},
);
