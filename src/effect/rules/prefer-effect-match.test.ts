import { run } from "../../../test/rule-tester.ts";

const MESSAGE = "Use Match from Effect instead of a chained literal ternary.";

run("preferEffectMatch", new URL("./prefer-effect-match.ts", import.meta.url), {
	valid: [
		'kind === "a" ? first : fallback;',
		'kind === "a" ? first : other === "b" ? second : fallback;',
		"condition ? first : otherCondition ? second : fallback;",
		{
			name: "chain broken by a non-literal test",
			code: 'kind === "a" ? first : kind === "b" ? second : condition ? third : fallback;',
		},
		{
			name: "non-literal comparison",
			code: "kind === a ? first : kind === b ? second : fallback;",
		},
		{
			name: "template literal with a substitution",
			code: `kind === \`\${a}\` ? first : kind === \`\${b}\` ? second : fallback;`,
		},
		{
			name: "relational operator",
			code: "count < 1 ? first : count < 2 ? second : fallback;",
		},
		{
			name: "chain nested in the consequent is not followed",
			code: 'kind === "a" ? (kind === "b" ? first : kind === "c" ? second : third) : fallback;',
		},
		{
			name: "different text for the same value",
			code: 'item.kind === "a" ? first : item .kind === "b" ? second : fallback;',
		},
	],
	invalid: [
		{
			code: 'kind === "a" ? first : kind === "b" ? second : fallback;',
			errors: [{ message: MESSAGE, line: 1 }],
		},
		{
			code: "`a` !== kind ? first : `b` === kind ? second : fallback;",
			errors: [{ message: MESSAGE }],
		},
		{
			name: "mixed literal kinds and sides",
			code: "value === 1 ? one : null == value ? none : value != true ? other : value === 2n ? big : fallback;",
			errors: [{ message: MESSAGE }],
		},
		{
			name: "parenthesized tests, operands, and alternates",
			code: 'const label = ((kind) === "a") ? "A" : ((kind === ("b")) ? "B" : "Other");',
			errors: [{ message: MESSAGE }],
		},
		{
			name: "member expression compared by source text",
			code: 'const label = item.kind === "a" ? "A" : item.kind === "b" ? "B" : item.kind === "c" ? "C" : "Other";',
			errors: [{ message: MESSAGE }],
		},
		{
			name: "trailing comments are outside the compared text",
			code: 'kind === "a" ? first : kind /* note */ === "b" ? second : fallback;',
			errors: [{ message: MESSAGE }],
		},
		{
			name: "only the outermost conditional is reported",
			code: 'const label =\n\tkind === "a"\n\t\t? "A"\n\t\t: kind === "b"\n\t\t\t? "B"\n\t\t\t: "Other";',
			errors: [{ message: MESSAGE, line: 2 }],
		},
		{
			name: "chain inside a non-conditional parent",
			filename: "input.tsx",
			code: 'const element = <Label text={kind === "a" ? "A" : kind === "b" ? "B" : "Other"} />;',
			errors: [{ message: MESSAGE }],
		},
	],
});
