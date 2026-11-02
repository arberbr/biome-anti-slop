import { run } from "../../test/rule-tester.ts";

const error = {
	message:
		"This conditional spread hides property omission behind an empty object.",
};

run(
	"noConditionalEmptyObjectSpread",
	new URL("./no-conditional-empty-object-spread.ts", import.meta.url),
	{
		valid: [
			"const result = { value };",
			"const result = { ...values };",
			"const result = condition ? { value } : {};",
			{
				name: "array spread",
				code: "const result = [...(condition ? [] : values)];",
			},
			{
				name: "call argument spread",
				code: "use(...(condition ? {} : values));",
			},
			{
				name: "both branches non-empty",
				code: "const result = { ...(condition ? { a } : { b }) };",
			},
			{
				name: "logical spread",
				code: "const result = { ...(condition && { value }) };",
			},
		],
		invalid: [
			{
				code: "const result = { ...(value !== undefined ? { value } : {}) };",
				errors: [{ ...error, line: 1 }],
				output: null,
			},
			{
				code: "const result = { ...(condition ? {} : { value }) };",
				errors: [error],
			},
			{
				name: "unparenthesized conditional",
				code: "const result = { ...condition ? { value } : {} };",
				errors: [error],
			},
			{
				name: "parenthesized empty branch",
				code: "const result = { ...(condition ? { value } : ({})) };",
				errors: [error],
			},
			{
				name: "nested object",
				code: "const result = { a: { ...(c ? {} : { b }) } };",
				errors: [error],
			},
		],
	},
);
