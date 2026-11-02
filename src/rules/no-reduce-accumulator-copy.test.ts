import { run } from "../../test/rule-tester.ts";

const error = {
	message: "Do not copy the reducer accumulator on every iteration",
};

run(
	"noReduceAccumulatorCopy",
	new URL("./no-reduce-accumulator-copy.ts", import.meta.url),
	{
		valid: [
			"items.reduce((acc, item) => { acc.push(item); return acc; }, []);",
			"items.reduce((acc, item) => Object.assign(acc, item), {});",
			"items.reduce((acc, item) => Object.assign(acc, acc, item), {});",
			"items.reduce((acc, item) => { acc[item.id] = { ...item }; return acc; }, {});",
			"items.reduce((acc, item) => { acc.push(Object.assign({}, item)); return acc; }, []);",
			"items.reduce((acc, item) => { acc.push(item.slice()); return acc; }, []);",
			"items.reduce((acc, item) => acc.concat(item), '');",
			"items.reduce((acc, item) => acc.concat(item), customCollection);",
			"function copy(acc) { return Object.assign({}, acc); }",
			"items.map((acc, item) => Object.assign({}, acc));",
			"items.reduce((acc, item) => { function copy(acc) { return Object.assign({}, acc); } return acc; }, {});",
			"items.reduce((acc, item) => { const snapshot = () => Object.assign({}, acc); return acc; }, {});",
			"items.reduce((acc, item) => { { const acc = {}; Object.assign({}, acc); } return acc; }, {});",
			"const Object = custom; items.reduce((acc, item) => Object.assign({}, acc), {});",
			"function run(Object) { return items.reduce((acc, item) => Object.assign({}, acc), {}); }",
			"const Array = custom; items.reduce((acc, item) => Array.from(acc), []);",
			"items.reduce((acc, item) => { let alias = acc; alias = item; return Object.assign({}, alias); }, {});",
			"items.reduce((acc, item) => [...acc, item], []);", // Owned by Biome's noAccumulatingSpread.
			"items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});",
			{
				name: "callback is not the first argument",
				code: "items.reduce(initial, (acc, item) => Object.assign({}, acc));",
			},
			{
				name: "too many arguments",
				code: "items.reduce((acc, item) => Object.assign({}, acc), {}, extra);",
			},
			{
				name: "rest accumulator",
				code: "items.reduce((...args) => Object.assign({}, args), {});",
			},
			{
				name: "destructured accumulator",
				code: "items.reduce(({ total }, item) => Object.assign({}, total), {});",
			},
			{
				name: "method inside the reducer",
				code: "items.reduce((acc, item) => ({ copy() { return Object.assign({}, acc); } }), {});",
			},
			{
				name: "let alias is not followed",
				code: "items.reduce((acc, item) => { let alias = acc; return Object.assign({}, alias); }, {});",
			},
			{
				name: "array copy without array initial value",
				code: "items.reduce((acc, item) => acc.slice(), initial);",
			},
			{
				name: "spread argument to Object.assign",
				code: "items.reduce((acc, item) => Object.assign({}, ...acc), {});",
			},
		],
		invalid: [
			{
				code: "items.reduce((acc, item) => Object.assign({}, acc, { [item.id]: item }), {});",
				errors: [{ ...error, line: 1 }],
			},
			{
				code: "items.reduceRight((acc, item) => Object.assign({}, acc, item), {});",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item, index, array) => Object.assign({}, acc, item), {});",
				errors: [error],
			},
			{
				code: "items.reduce(acc => Object.assign({}, acc), {});",
				errors: [error],
			},
			{
				code: "items.reduce(function (acc, item) { return Object.assign({}, item, acc); }, {});",
				errors: [error],
			},
			{
				code: "items['reduce'](((acc, item) => Object['assign']({}, acc, item)), {});",
				errors: [error],
			},
			{
				code: "items.reduce((acc = {}, item) => Object.assign({}, acc, item), {});",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => { const alias = acc; return Object.assign({}, alias, item); }, {});",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => Object.assign({}, acc as State, item), {});",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => { const next = Object.assign({}, acc); next[item.id] = item; return next; }, {});",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => acc.concat([item]), []);",
				errors: [error],
			},
			{
				code: "items.reduceRight((acc, item, index) => acc['concat']([item]), [] as Item[]);",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => { const next = acc.slice(); next.push(item); return next; }, []);",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => { const alias = acc; return alias.concat(item); }, []);",
				errors: [error],
			},
			{
				code: "const initial = []; items.reduce((acc, item) => acc.concat(item), initial);",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => { const next = Array.from(acc); next.push(item); return next; }, []);",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => acc.toSpliced(acc.length, 0, item), []);",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => acc.toSorted(), []);",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => acc.toReversed(), []);",
				errors: [error],
			},
			{
				code: "items.reduce((acc, item) => acc.with(0, item), []);",
				errors: [error],
			},
			{
				name: "typed accumulator parameter",
				code: "items.reduce((acc: State, item: Item) => Object.assign({}, acc, item), {});",
				errors: [error],
			},
			{
				name: "satisfies-wrapped callback",
				code: "items.reduce(((acc, item) => Object.assign({}, acc)) satisfies Reducer, {});",
				errors: [error],
			},
			{
				name: "two sibling reducers with the same accumulator name",
				code: "a.reduce((acc, x) => Object.assign({}, acc), {});\nb.reduce((acc, x) => { { const acc = {}; Object.assign({}, acc); } return Object.assign({}, acc); }, {});",
				errors: [
					{ ...error, line: 1 },
					{ ...error, line: 2 },
				],
			},
		],
	},
);
