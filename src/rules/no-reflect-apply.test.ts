import { run } from "../../test/rule-tester.ts";

run("noReflectApply", new URL("./no-reflect-apply.ts", import.meta.url), {
	valid: [
		"const value = operation.apply(owner, args);",
		"Reflect.get(owner, key);",
		"const Reflect = { apply() { return 1; } }; Reflect.apply();",
		"function invoke(Reflect: { apply(): number }) { return Reflect.apply(); }",
	],
	invalid: [
		{ code: "const value = Reflect.apply(operation, owner, args);", errors: 1 },
		{
			code: "const value = Reflect['apply'](operation, owner, args);",
			errors: 1,
		},
	],
});
