import { run } from "../../test/rule-tester.ts";

const error = { message: "Replace module mocking with dependency injection" };

run("noModuleMocking", new URL("./no-module-mocking.ts", import.meta.url), {
	valid: [
		"const store = new InMemoryUserStore();",
		"vi.spyOn(store, 'save');",
		"const vi = { mock() {} }; vi.mock();",
		"function test(jest: { mock(): void }) { jest.mock(); }",
		"import { vi as localVi } from './helpers'; localVi.mock('./module');",
		{
			name: "same name imported from elsewhere",
			code: "import { vi } from './helpers'; vi.mock('./module');",
		},
		{
			name: "jest export from vitest",
			code: "import { jest } from 'vitest'; jest.mock('./module');",
		},
		{
			name: "renamed import of another export",
			code: "import { expect as vi } from 'vitest'; vi.mock('./module');",
		},
		{
			name: "default import",
			code: "import vi from 'vitest'; vi.mock('./module');",
		},
		{
			name: "namespace import",
			code: "import * as vi from 'vitest'; vi.mock('./module');",
		},
		{ name: "dynamic method name", code: "vi[method]('./module');" },
		{
			name: "other jest helpers",
			code: "jest.fn(); jest.spyOn(store, 'save'); jest.useFakeTimers();",
		},
		{ name: "other globals", code: "mocker.mock('./module');" },
		{
			name: "block-scoped shadow",
			code: "{ const jest = fake; jest.mock('./module'); }",
		},
	],
	invalid: [
		{ code: "vi.mock('./user-store');", errors: [{ ...error, line: 1 }] },
		{ code: "jest.mock('./user-store');", errors: [error] },
		{ code: "vi['doMock']('./user-store');", errors: [error] },
		{ code: "jest.unstable_mockModule('./user-store');", errors: [error] },
		{
			code: "import { vi } from 'vitest'; vi.mock('./user-store');",
			errors: [error],
		},
		{
			code: "import { vi as testApi } from 'vitest'; testApi.mock('./user-store');",
			errors: [error],
		},
		{
			code: "import { jest } from '@jest/globals'; jest.mock('./user-store');",
			errors: [error],
		},
		{
			name: "string-named import",
			code: "import { \"vi\" as testApi } from 'vitest'; testApi.doMock('./user-store');",
			errors: [error],
		},
		{
			name: "combined import",
			code: "import api, { vi } from 'vitest'; vi.mock('./user-store');",
			errors: [error],
		},
		{
			name: "optional and parenthesized",
			code: "(vi)?.mock('./user-store'); (jest.mock)('./user-store');",
			errors: [error, error],
		},
		{
			name: "test file",
			filename: "user.test.ts",
			code: "vi.mock('./user-store', () => ({ load: vi.fn() }));",
			errors: [error],
		},
	],
});
