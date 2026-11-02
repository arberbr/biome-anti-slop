import { run } from "../../test/rule-tester.ts";

const error = { message: "This assertion chain discards type evidence." };

run(
	"noChainedTypeAssertions",
	new URL("./no-chained-type-assertions.ts", import.meta.url),
	{
		valid: [
			"const value = input as User;",
			"const value = (input as User);",
			"const value = ({ id: 1 } as const) as const;",
			{
				name: "single angle-bracket assertion",
				code: "const value = <User>input;",
			},
			{
				name: "satisfies is not an assertion",
				code: "const value = (input satisfies Shape) as User;",
			},
			{
				name: "non-null is not an assertion",
				code: "const value = (input as User)!;",
			},
			{
				name: "separate assertions in one expression",
				code: "const pair = [left as A, right as B];",
			},
			{
				name: "assertion inside a member access",
				code: "const value = ((input as Box).value) as User;",
			},
		],
		invalid: [
			{
				name: "as chain",
				code: "const value = input as unknown as User;",
				errors: [{ ...error, line: 1 }],
			},
			{
				name: "parenthesized chain",
				code: "const value = (input as unknown) as User;",
				errors: [error],
			},
			{
				name: "angle-bracket chain",
				code: "const value = <User>(<unknown>input);",
				errors: [error],
			},
			{
				name: "mixed const chain",
				code: "const value = ({ id: 1 } as const) as User;",
				errors: [error],
			},
			{
				name: "mixed syntax chain",
				code: "const value = (<unknown>input) as User;",
				errors: [error],
			},
			{
				name: "triple chain reports once",
				code: "const value = input as unknown as object as User;",
				errors: 1,
			},
			{
				name: "doubly parenthesized chain",
				code: "const value = ((input as unknown)) as User;",
				errors: 1,
			},
			{
				name: "chain on an assignment target",
				code: "declare let target: string;\n(target as unknown as number) = 1;",
				errors: 1,
			},
			{
				name: "angle-bracket chain on an assignment target",
				code: "declare let target: string;\n(<number>(<unknown>target)) = 1;",
				errors: 1,
			},
		],
	},
);
