import { run } from "../../test/rule-tester.ts";

run("noReflectGet", new URL("./no-reflect-get.ts", import.meta.url), {
	valid: [
		"const value = owner.property;",
		"const value = owner[key];",
		"Reflect.set(owner, key, value);",
		"const Reflect = { get() { return 1; } }; Reflect.get();",
		"function read(Reflect: { get(): number }) { return Reflect.get(); }",
	],
	invalid: [
		{
			name: "static access",
			code: "const value = Reflect.get(owner, key);",
			errors: [{ message: "Reflect.get", line: 1 }],
		},
		{
			name: "computed access",
			code: "const value = Reflect['get'](owner, key);",
			errors: 1,
		},
		{
			name: "optional and parenthesized",
			code: "const value = (Reflect)?.get(owner, key);",
			errors: 1,
		},
	],
});
