import { run } from "../../../test/rule-tester.ts";

const MESSAGE = "Data.taggedEnum variant constructor";

run(
	"noManualTaggedConstruction",
	new URL("./no-manual-tagged-construction.ts", import.meta.url),
	{
		valid: [
			'Match.when({ _tag: "Ready" }, handleReady);',
			'Match.not({ "_tag": "Pending" });',
			"Ready.make({ value });",
			"new NotFound({ id });",
			"({ _tag: tag, value });",
			{
				name: "parenthesized Match pattern",
				code: 'Match.when(({ _tag: "Ready" }), handleReady);',
			},
			{
				name: "computed identifier key",
				code: 'const value = { [_tag]: "Ready" };',
			},
			{
				name: "template literal key and value",
				code: 'const value = { [`_tag`]: "Ready", _tag: `Ready` };',
			},
			{
				name: "method named _tag",
				code: 'const value = { _tag() { return "Ready"; } };',
			},
			{
				name: "shorthand _tag",
				code: "const value = { _tag };",
			},
			{
				name: "object destructuring assignment",
				code: "({ _tag: target } = source);",
			},
		],
		invalid: [
			{
				code: 'const value = { _tag: "Ready", payload };',
				errors: [{ message: MESSAGE, line: 1 }],
			},
			{
				code: 'const value = { ["_tag"]: "Ready" };',
				errors: [{ message: MESSAGE }],
			},
			{
				name: "quoted key and parenthesized value",
				code: "const value = { '_tag': (\"Ready\") };",
				errors: [{ message: MESSAGE }],
			},
			{
				name: "object nested inside a Match pattern argument",
				code: 'Match.when({ inner: { _tag: "Ready" } }, handleReady);',
				errors: [{ message: MESSAGE }],
			},
			{
				name: "pattern passed to another Match method",
				code: 'Match.tag({ _tag: "Ready" });',
				errors: [{ message: MESSAGE }],
			},
			{
				name: "reported once per object, on the property line",
				code: 'const value = {\n\tpayload,\n\t_tag: "Ready",\n\t_tag: "Other",\n};',
				errors: [{ message: MESSAGE, line: 3 }],
			},
			{
				name: "TSX file",
				filename: "input.tsx",
				code: 'const element = <Item value={{ _tag: "Ready" }} />;',
				errors: [{ message: MESSAGE }],
			},
		],
	},
);
