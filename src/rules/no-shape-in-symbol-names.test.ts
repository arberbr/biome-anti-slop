import { run } from "../../test/rule-tester.ts";

const error = { message: '"shape" describes structure rather than ownership.' };

run(
	"noShapeInSymbolNames",
	new URL("./no-shape-in-symbol-names.ts", import.meta.url),
	{
		valid: [
			"declare const schema: ExternalSchema; const field = schema.shape.id;",
			"declare const outer: External; const value = outer.inner.shape;",
			"declare const schema: ExternalSchema; schema.shape.id.parse('x');",
			"const owner = { id: 1 }; const value = owner.id;",
			{
				name: "optional member access",
				code: "declare const schema: ExternalSchema; const field = schema?.shape;",
			},
			{
				name: "string-keyed property",
				code: "const payload = { 'shape': 1, \"Shape\": 2 };",
			},
			{
				name: "string literal values",
				code: "const kind = 'shape'; type Kind = 'shape';",
			},
			{ name: "comments", code: "// shape\nconst kind = 1;" },
			{
				name: "private member access",
				code: "class Box { #id = 1; read(other: Box) { return other.#id; } }",
			},
		],
		invalid: [
			{
				code: "const shape = 1;",
				errors: [{ message: 'Rename symbol "shape"', line: 1 }],
			},
			{
				code: "function shapeOf() {}",
				errors: [{ message: 'Rename symbol "shapeOf"' }],
			},
			{
				code: "type PayloadShape = { id: string };",
				errors: [{ message: 'Rename symbol "PayloadShape"' }],
			},
			{ code: "type Payload = { shape: string };", errors: [error] },
			{
				code: "declare const owner: External; const shape = 'field'; const value = owner[shape];",
				errors: 2,
			},
			{
				name: "object property key",
				code: "const payload = { shape: 1 };",
				errors: [error],
			},
			{
				name: "shorthand property reports the one spelled name",
				code: "const payload = { shape };",
				errors: 1,
			},
			{
				name: "assignment target",
				code: "let SHAPE = 1; SHAPE = 2;",
				errors: 2,
			},
			{
				name: "class members",
				code: "class Reshaper { reshape() {} #shapes = []; }",
				errors: 3,
			},
			{
				name: "private field use",
				code: "class Box { #shape = 1; read() { return this.#shape; } }",
				errors: [{ message: 'Rename symbol "shape"' }],
			},
			{
				name: "private in check",
				code: "class Box { #shape = 1; static has(value: object) { return #shape in value; } }",
				errors: 2,
			},
			{
				name: "interface, type parameter, enum",
				code: "interface Shaped<TShape> { id: TShape }\nenum Kind { Shape }",
				errors: 4,
			},
			{
				name: "imports and exports",
				code: "import { shape as local } from 'lib';\nconst value = local;\nexport { value as shapeValue };",
				errors: 2,
			},
			{ name: "label", code: "shapes: for (;;) { break shapes; }", errors: 2 },
			{
				name: "qualified type name",
				code: "let value: Schema.shape;",
				errors: 1,
			},
			{
				name: "named tuple member",
				code: "type Pair = [shape: string, id: number];",
				errors: 1,
			},
			{
				name: "namespace",
				code: "namespace Shapes { export const id = 1; }",
				errors: 1,
			},
			{
				name: "destructured key",
				code: "const { shape: local } = input;",
				errors: 1,
			},
			{
				name: "jsx element and attribute names",
				filename: "input.tsx",
				code: "const view = <Shape shapeId={1}><shape-box /></Shape>;",
				errors: 4,
			},
		],
	},
);
