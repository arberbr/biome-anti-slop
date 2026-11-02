import { run } from "../../../test/rule-tester.ts";

run(
	"noServiceConstructorImports",
	new URL("./no-service-constructor-imports.ts", import.meta.url),
	{
		valid: [
			{
				filename: "src/issue-service.test.ts",
				code: 'import { makeIssueService } from "./issue-service.ts";',
			},
			{
				filename: "src/issue-service.spec.tsx",
				code: 'import { makeIssueService } from "../issue-service.ts";',
			},
			{
				filename: "src/runtime.ts",
				code: 'import { makeExecutionMemo } from "alchemy/Runtime/ExecutionMemo";',
			},
			{
				filename: "src/runtime.ts",
				code: 'import { issueServiceLayer } from "./issue-service.ts";\nWorkspaceName.make("name");',
			},
			{
				filename: "src/runtime.ts",
				code: 'import { makeissueService } from "./issue-service.ts";',
			},
			{
				name: "default import",
				filename: "src/runtime.ts",
				code: 'import makeIssueService from "./issue-service.ts";',
			},
			{
				name: "namespace import",
				filename: "src/runtime.ts",
				code: 'import * as makeIssueService from "./issue-service.ts";',
			},
			{
				name: "local alias named make<Name> of another export",
				filename: "src/runtime.ts",
				code: 'import { issueService as makeIssueService } from "./issue-service.ts";',
			},
			{
				name: "path alias",
				filename: "src/runtime.ts",
				code: 'import { makeIssueService } from "@/issue-service.ts";',
			},
			{
				name: "test file with a module extension",
				filename: "src/issue-service.test.mts",
				code: 'import { makeIssueService } from "./issue-service.ts";',
			},
			{
				name: "re-export is outside the rule",
				filename: "src/runtime.ts",
				code: 'export { makeIssueService } from "./issue-service.ts";',
			},
		],
		invalid: [
			{
				filename: "src/runtime.ts",
				code: 'import { makeIssueService } from "./issue-service.ts";',
				errors: [{ message: '"makeIssueService"', line: 1 }],
				output: null,
			},
			{
				filename: "src/runtime.ts",
				code: 'import { makeIssueService as createIssueService } from "../issue-service.ts";',
				errors: [{ message: '"makeIssueService"' }],
				output: null,
			},
			{
				name: "default file name",
				code: 'import { makeIssueService } from "./issue-service.ts";',
				errors: [{ message: "Import the owning Layer" }],
			},
			{
				name: "each constructor specifier is reported",
				filename: "src/runtime.ts",
				code: 'import { makeIssueService, issueLayer, makeUserService } from "./services.ts";',
				errors: [
					{ message: '"makeIssueService"' },
					{ message: '"makeUserService"' },
				],
			},
			{
				name: "combined default and named import",
				filename: "src/runtime.ts",
				code: 'import services, { makeIssueService } from "./services.ts";',
				errors: [{ message: '"makeIssueService"' }],
			},
			{
				name: "string export name",
				filename: "src/runtime.ts",
				code: 'import { "makeIssueService" as issueService } from "./services.ts";',
				errors: [{ message: '"makeIssueService"' }],
			},
			{
				name: "type-only imports are still reported",
				filename: "src/runtime.ts",
				code: 'import type { makeIssueService } from "./services.ts";\nimport { type makeUserService } from "./services.ts";',
				errors: [
					{ message: '"makeIssueService"', line: 1 },
					{ message: '"makeUserService"', line: 2 },
				],
			},
			{
				name: "test-like name that is not a test file",
				filename: "src/test-runtime.tsx",
				code: "import { makeIssueService } from './issue-service.ts';",
				errors: [{ message: '"makeIssueService"' }],
			},
		],
	},
);
