import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import prettier from 'prettier';
import { getTransformer } from '../index';

// createSuite(
// 	'systems',
// 	import.meta.glob('./systems/**/*.ts', {
// 		eager: true,
// 		as: 'raw',
// 	}),
// );
// createSuite(
// 	'structs',
// 	import.meta.glob('./structs/**/*.ts', {
// 		eager: true,
// 		as: 'raw',
// 	}),
// );
createSuite(
	'threads',
	import.meta.glob('./threads/**/*.ts', {
		eager: true,
		as: 'raw',
	}),
);
// createSuite(
// 	'serialize inserts',
// 	import.meta.glob('./serialize_inserts/**/*.ts', {
// 		eager: true,
// 		as: 'raw',
// 	}),
// );

const customConfig = {
	MyCustomParameter: {
		descriptorName: 'MyCustomParameterDescriptor',
		importPath: ':somewhere',
	},
};
const transform = getTransformer({
	systemParameters: customConfig,
});
const printer = ts.createPrinter();
export function createSuite(name: string, tests: Record<string, string>) {
	const suite = createTestSuite(tests);
	describe(name, () => {
		for (const [
			testName,
			{ inFiles, outFiles, skip, only },
		] of Object.entries(suite)) {
			const itType = skip ? it.skip : only ? it.only : it;
			itType(testName.replaceAll('_', ' '), () => {
				const program = ts.createProgram(
					inFiles.map(file => file.path),
					{},
				);
				for (let i = 0; i < inFiles.length; i++) {
					const transformResult = ts.transform(
						program.getSourceFile(inFiles[i].path)!,
						[transform(program)],
					);
					const str = printer.printFile(
						transformResult.transformed[0],
					);
					expect(format(str)).toBe(format(outFiles[i].content));
				}
			});
		}
	});
}

type Test = {
	inFiles: File[];
	outFiles: File[];
	skip: boolean;
	only: boolean;
};
type File = {
	path: string;
	content: string;
};

type TestSuites = Record<string, Test>;

function createTestSuite(files: Record<string, string>) {
	return Object.entries(files).reduce<TestSuites>(
		(testSuites, [path, content]) => {
			const [, , testName, inOrOut, fileName] = path.split('/');
			if (!(testName in testSuites)) {
				testSuites[testName] = {
					inFiles: [],
					outFiles: [],
					skip: testName.startsWith('skip.'),
					only: testName.startsWith('only.'),
				};
			}
			const test = testSuites[testName];
			const file = {
				path: new URL(path, import.meta.url).pathname,
				content,
			};
			test[`${inOrOut as 'in' | 'out'}Files`].push(file);
			// if (inOrOut === 'in' && fileName === 'index.ts') {
			// 	test.inFiles.unshift(file);
			// } else {
			// 	test[`${inOrOut as 'in' | 'out'}Files`].push(file);
			// }
			return testSuites;
		},
		{},
	);
}

const format = (str: string) => prettier.format(str, { parser: 'typescript' });
