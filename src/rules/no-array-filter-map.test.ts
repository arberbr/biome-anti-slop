import { run } from "../../test/rule-tester.ts";

const message = "Avoid consecutive array";

run("noArrayFilterMap", new URL("./no-array-filter-map.ts", import.meta.url), {
	valid: [
		"const users = []; users.values().filter(active).map(email).toArray();",
		"const users = []; users.values().map(email).filter(Boolean).toArray();",
		"Iterator.from(users).filter(active).map(email).toArray();",
		"function collect(users: IteratorObject<User>) { return users.filter(active).map(email).toArray(); }",
		"const users = []; users.flatMap(user => user.active ? [user.email] : []);",
		"const users = []; users.map(email); users.filter(active);",
		"const users = []; users.map(email).map(normalize);",
		"const users = []; users.filter(active).filter(verified);",
		"const custom = { filter() { return this; }, map() {} }; custom.filter(active).map(email);",
		"function collect(unknownReceiver) { return unknownReceiver.filter(active).map(email); }",
		"const users = fetchUsers(); users.filter(active).map(email);",
		"const users = []; function collect(users) { return users.filter(active).map(email); }",
		"let users = []; users = iterator; users.filter(active).map(email);",
		"const users = []; users[method](active).map(email);",
		"const first = second; const second = first; first.filter(active).map(email);",
		{
			name: "let without annotation is not followed",
			code: "let users = []; users.filter(active).map(email);",
		},
		{
			name: "annotated but reassigned",
			code: "let users: User[] = []; users = other; users.filter(active).map(email);",
		},
		{
			name: "non-array annotation wins over initializer",
			code: "const users: Set<User> = [] as never; users.filter(active).map(email);",
		},
		{
			name: "private method names are not array methods",
			code: "class A { #filter() { return []; } run() { this.#filter().map(email); } }",
		},
	],
	invalid: [
		{
			code: "[].filter(active).map(email);",
			errors: [
				{
					message: "Avoid consecutive array `filter` and `map` passes",
					line: 1,
				},
			],
		},
		{
			code: "[].map(user => user.active ? user.email : undefined).filter(email => email !== undefined);",
			errors: [
				{ message: "Avoid consecutive array `map` and `filter` passes" },
			],
		},
		{
			code: "const users = []; users.map(email).filter(Boolean);",
			errors: [{ message }],
		},
		{
			code: "const users = []; const alias = users; alias.filter(active).map(email);",
			errors: [{ message }],
		},
		{
			code: "function collect(users: User[]) { return users.filter(active).map(email); }",
			errors: [{ message }],
		},
		{
			code: "function collect(users: readonly User[]) { return users.map(email).filter(present); }",
			errors: [{ message }],
		},
		{
			code: "function collect(users: ReadonlyArray<User>) { return users.filter(active).map(email); }",
			errors: [{ message }],
		},
		{
			code: "function collect(users: Array<User>) { return users.filter(active).map(email); }",
			errors: [{ message }],
		},
		{
			code: "const users = [] as const; users['filter'](active)['map'](email);",
			errors: [{ message }],
		},
		{
			code: "const users = []; (users.filter(active)!).map(email);",
			errors: [{ message }],
		},
		{
			code: "const users = []; users?.filter(active)?.map(email);",
			errors: [{ message }],
		},
		{
			code: "const users = []; users.slice().filter(active).map(email);",
			errors: [{ message }],
		},
		{
			code: "const users = []; users.filter(active).map(email).filter(Boolean);",
			errors: [{ message }, { message }],
		},
		{
			name: "tuple annotation",
			code: "const pair: [User, User] = load(); pair.filter(active).map(email);",
			errors: 1,
		},
		{
			name: "parenthesized readonly annotation",
			code: "const users: (readonly User[]) = load(); users.filter(active).map(email);",
			errors: 1,
		},
		{
			name: "arrow parameter annotation",
			code: "const collect = (users: User[]) => users.filter(active).map(email);",
			errors: 1,
		},
		{
			name: "satisfies wrapper",
			code: "const users = [] satisfies User[]; users.filter(active).map(email);",
			errors: 1,
		},
		{
			name: "definite assignment annotation",
			code: "let users!: User[]; users.filter(active).map(email);",
			errors: 1,
		},
		{
			name: "multiline chain reports on the outer call",
			code: "const users = [];\nusers\n\t.filter(active)\n\t.map(email);",
			errors: [{ line: 2 }],
		},
	],
});
