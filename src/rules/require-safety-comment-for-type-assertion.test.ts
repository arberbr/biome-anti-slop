import { run } from "../../test/rule-tester.ts";

/**
 * Biome hides comments before a file's first statement from plugins, so most
 * cases start with an unrelated statement to make the comment under test visible.
 */
const lead = "declare const value: unknown;\n";
const missing = "has no `SAFETY:` justification";

run(
	"requireSafetyCommentForTypeAssertion",
	new URL("./require-safety-comment-for-type-assertion.ts", import.meta.url),
	{
		valid: [
			{
				name: "justified assertion on an assignment target",
				code: `${lead}declare const buffer: unknown[];
// SAFETY: the first slot always holds the accumulated string.
(buffer[0] as string) += "x";`,
			},
			"const values = [1, 2] as const;",
			"const value = <const>{ id: 'one' };",
			"const user = { id: 'one' } satisfies User;",
			"const user = maybe!;",
			`${lead}// SAFETY: The parser established the UserId invariant.\nconst id = value as UserId;`,
			`${lead}function parse(): UserId {\n// SAFETY: Validation above established the UserId invariant.\nreturn value as UserId;\n}`,
			`${lead}const id = /* SAFETY: Validation established the invariant. */ value as UserId;`,
			`${lead}// SAFETY: The parser established the exported UserId invariant.\nexport const id = value as UserId;`,
			`${lead}/* SAFETY:\n * The parser established the exported UserId invariant.\n */\nexport const id = value as UserId;`,
			{
				name: "comment inside the first statement is visible",
				code: "const id = /* SAFETY: Validation established the invariant. */ value as UserId;",
			},
			{
				name: "angle-bracket assertion",
				code: `${lead}// SAFETY: The parser established the UserId invariant.\nconst id = <UserId>value;`,
			},
			{
				name: "throw statement",
				code: `${lead}function fail() {\n// SAFETY: Only Error values reach this branch.\nthrow value as Error;\n}`,
			},
			{
				name: "expression statement",
				code: `${lead}// SAFETY: The registry only stores handlers.\n(value as Handler)();`,
			},
			{
				name: "class property",
				code: `${lead}class Box {\n// SAFETY: The constructor argument was validated.\nreadonly id = value as UserId;\n}`,
			},
			{
				name: "comment above a non-owner statement covers its condition",
				code: `${lead}// SAFETY: Validation established the flag invariant.\nif (value as boolean) {\n}`,
			},
			{
				name: "comment above an enclosing function covers a nested condition",
				code: `${lead}// SAFETY: Callers pass validated flags.\nfunction check() {\nif (value as boolean) {\n}\n}`,
			},
			{
				name: "comment before an argument",
				code: `${lead}use(/* SAFETY: Validated above. */ value as UserId);`,
			},
			{
				name: "word-bounded marker inside a longer comment",
				code: `${lead}// Note (SAFETY: the parser checked the brand).\nconst id = value as UserId;`,
			},
			{
				name: "tsx file",
				filename: "input.tsx",
				code: `${lead}// SAFETY: The parser established the UserId invariant.\nconst id = value as UserId;`,
			},
		],
		invalid: [
			{
				name: "assertion on a compound assignment target",
				code: `${lead}declare const buffer: unknown[];
(buffer[0] as string) += "x";`,
				errors: [{ message: missing, line: 3 }],
			},
			{
				name: "angle-bracket assertion on an assignment target",
				code: `${lead}declare let target: unknown;
(<string>target) = "x";`,
				errors: [{ message: missing, line: 3 }],
			},
			{
				code: `${lead}const id = value as UserId;`,
				errors: [{ message: missing, line: 2 }],
			},
			{
				code: `${lead}const id = <UserId>value;`,
				errors: [{ message: missing, line: 2 }],
			},
			{
				code: `${lead}const id = value as UserId; // SAFETY: Too late.`,
				errors: 1,
			},
			{
				code: `${lead}// This cast seems fine.\nconst id = value as UserId;`,
				errors: 1,
			},
			{ code: `${lead}// SAFETY:\nconst id = value as UserId;`, errors: 1 },
			{ code: `${lead}// SAFETY:   \nconst id = value as UserId;`, errors: 1 },
			{ code: `${lead}const id = /* SAFETY: */ value as UserId;`, errors: 1 },
			{ code: `${lead}export const id = value as UserId;`, errors: 1 },
			{
				code: `${lead}// This is not a safety justification.\nexport const id = value as UserId;`,
				errors: 1,
			},
			{
				name: "marker must be a whole word",
				code: `${lead}// UNSAFETY: Not a justification.\nconst id = value as UserId;`,
				errors: 1,
			},
			{
				name: "comment on a function does not cover statements in its body",
				code: `${lead}// SAFETY: Callers pass validated users.\nfunction parse(): UserId {\nreturn value as UserId;\n}`,
				errors: [{ message: missing, line: 4 }],
			},
			{
				name: "each assertion needs its own justification",
				code: `${lead}// SAFETY: The first value was validated.\nconst a = value as A;\nconst b = value as B;`,
				errors: [{ message: missing, line: 4 }],
			},
			{
				name: "a comment after the assertion does not count",
				code: `${lead}const id = value as /* SAFETY: Too late. */ UserId;`,
				errors: 1,
			},
			{
				name: "nested assertions are each reported",
				code: `${lead}const id = (value as Wrapper as UserId);`,
				errors: 2,
			},
			{
				name: "first statement without a comment",
				code: "const id = value as UserId;",
				errors: [
					{
						message: "cannot read comments before a file's first statement",
						line: 1,
					},
				],
			},
			{
				name: "comment before the first statement is invisible to plugins",
				code: "// SAFETY: The parser established the UserId invariant.\nconst id = value as UserId;",
				errors: [
					{ message: "cannot read comments before a file's first statement" },
				],
			},
		],
	},
);
