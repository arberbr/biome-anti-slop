import { run } from "../../../test/rule-tester.ts";

const COMPARISON = "Use Match.tag/Match.tags";
const SWITCH = "instead of switching on `_tag`";

run(
	"noManualTagComparison",
	new URL("./no-manual-tag-comparison.ts", import.meta.url),
	{
		valid: [
			'Predicate.isTagged("Ready")(value);',
			'Match.value(value).pipe(Match.tag("Ready", handleReady));',
			'if (value.status === "Ready") handleReady(value);',
			'Effect.catch((error) => error._tag === "NotFound" ? recover : fail);',
			{
				name: "comparison against a non-literal",
				code: "value._tag === expected;",
			},
			{
				name: "comparison between two tags",
				code: "left._tag === right._tag;",
			},
			{
				name: "template literal operand is not a string literal",
				code: "value._tag === `Ready`;",
			},
			{
				name: "private _tag field",
				code: 'class Box { #_tag = "a"; is() { return this.#_tag === "Ready"; } }',
			},
			{
				name: "switch on another property",
				code: 'switch (value.status) { case "Ready": handleReady(value); }',
			},
			{
				name: "switch inside a broad catch handler belongs to noManualEffectErrorTag",
				code: 'Effect.catchIf(predicate, (error) => { switch (error._tag) { case "NotFound": return recover; } });',
			},
		],
		invalid: [
			{
				code: 'value._tag === "Ready";',
				errors: [{ message: COMPARISON, line: 1 }],
			},
			{
				code: '"Ready" !== value["_tag"];',
				errors: [{ message: COMPARISON }],
			},
			{
				code: 'switch (value._tag) { case "Ready": handleReady(value); }',
				errors: [{ message: SWITCH }],
			},
			{
				name: "loose equality and parentheses",
				code: 'if ((value._tag) == ("Ready")) handleReady(value);',
				errors: [{ message: COMPARISON }],
			},
			{
				name: "optional chaining on the tag",
				code: 'value?._tag === "Ready";',
				errors: [{ message: COMPARISON }],
			},
			{
				name: "parenthesized switch discriminant",
				code: 'switch ((value["_tag"])) { case "Ready": break; }',
				errors: [{ message: SWITCH }],
			},
			{
				name: "inside an Effect.catchTag handler",
				code: 'Effect.catchTag("Wrapper", (error) => error.reason._tag === "Timeout");',
				errors: [{ message: COMPARISON }],
			},
			{
				name: "inside an object method within a broad handler",
				code: 'Effect.catch((error) => ({ check() { return error._tag === "NotFound"; } }));',
				errors: [{ message: COMPARISON }],
			},
			{
				name: "every comparison is reported in a TSX file",
				filename: "input.tsx",
				code: 'const ready = value._tag === "Ready";\nconst done = value._tag !== "Done";',
				errors: [
					{ message: COMPARISON, line: 1 },
					{ message: COMPARISON, line: 2 },
				],
			},
		],
	},
);
