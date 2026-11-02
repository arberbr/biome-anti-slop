import { run } from "../../../test/rule-tester.ts";

const TAG = "Effect.catchTag or Effect.catchTags";
const REASON = "Effect.catchReason or Effect.catchReasons";

run(
	"noManualEffectErrorTag",
	new URL("./no-manual-effect-error-tag.ts", import.meta.url),
	{
		valid: [
			'error._tag === "NotFound";',
			'Effect.catchTag("NotFound", recover);',
			'Effect.catchTag("Wrapper", (error) => error.reason._tag === "Timeout" ? retry : fail);',
			{
				name: "comparison against a non-literal",
				code: "Effect.catch((error) => error._tag === expected ? recover : fail);",
			},
			{
				name: "non-equality operator",
				code: 'Effect.catch((error) => error._tag < "NotFound");',
			},
			{
				name: "computed Effect member is not recognized",
				code: 'Effect["catch"]((error) => error._tag === "NotFound");',
			},
			{
				name: "other Effect method",
				code: 'Effect.map((error) => error._tag === "NotFound");',
			},
			{
				name: "nearest function is a nested arrow passed elsewhere",
				code: 'Effect.catch((error) => items.map((item) => item._tag === "Ready"));',
			},
			{
				name: "object method inside the handler ends the search",
				code: 'Effect.catch((error) => ({ check() { return error._tag === "NotFound"; } }));',
			},
			{
				name: "handler passed as the callee rather than an argument",
				code: '((error) => error._tag === "NotFound")(Effect.catch);',
			},
			{
				name: "template literal key is not a tag member",
				code: 'Effect.catch((error) => error[`_tag`] === "NotFound");',
			},
		],
		invalid: [
			{
				code: 'Effect.catch((error) => error._tag === "NotFound" ? recover : fail);',
				errors: [{ message: TAG, line: 1 }],
			},
			{
				code: 'Effect.catchAll(function (error) { return error.reason._tag === "Timeout" ? retry : fail; });',
				errors: [{ message: REASON }],
			},
			{
				code: 'Effect.catchIf(predicate, (error) => { switch (error._tag) { case "NotFound": return recover; } });',
				errors: [{ message: TAG }],
			},
			{
				name: "reversed and computed comparison",
				code: 'Effect.catch((error) => "NotFound" !== error["_tag"]);',
				errors: [{ message: TAG }],
			},
			{
				name: "computed reason access",
				code: 'Effect.catch((error) => error["reason"]._tag == "Timeout");',
				errors: [{ message: REASON }],
			},
			{
				name: "switch on a reason tag",
				code: 'Effect.catchAll((error) => { switch (error.reason._tag) { case "Timeout": return retry; } });',
				errors: [{ message: REASON }],
			},
			{
				name: "parenthesized handler, callee, and operands",
				code: 'Effect.catch(((error) => (error._tag) === ("NotFound")));',
				errors: [{ message: TAG }],
			},
			{
				name: "function declarations inside the handler are looked through",
				code: 'Effect.catch((error) => { function isMissing() { return error._tag === "NotFound"; } return isMissing(); });',
				errors: [{ message: TAG }],
			},
			{
				name: "optional chaining on the tag",
				code: 'Effect.catch((error) => error?._tag === "NotFound");',
				errors: [{ message: TAG }],
			},
			{
				name: "pipeline in a TSX file",
				filename: "input.tsx",
				code: 'program.pipe(\n\tEffect.catch((error) =>\n\t\terror._tag === "NotFound" ? recover : Effect.fail(error),\n\t),\n);',
				errors: [{ message: TAG, line: 3 }],
			},
		],
	},
);
