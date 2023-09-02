import { createFilter } from '@rollup/pluginutils';
import {
	getTransformer,
	type TransformerConfig,
} from '@thyseus/typescript-transformer';
import ts from 'typescript';
import type { Plugin } from 'vite';

type ThyseusPluginConfig = {
	include?: string;
	exclude?: string;
} & TransformerConfig;

export function thyseus({
	include = 'src/**/*.ts',
	exclude,
	...transformerConfig
}: ThyseusPluginConfig = {}) {
	const filter = createFilter(include, exclude);
	const createTransformer = getTransformer(transformerConfig);
	const fileIds = new Set<string>();

	const printer = ts.createPrinter();
	let program: ts.Program;
	let transformer: ts.TransformerFactory<any>;

	return {
		name: '@thyseus/transformer-rollup',
		version: '0.14.0-beta.9',
		enforce: 'pre',
		transform(code, id) {
			if (!filter(id)) {
				return code;
			}
			if (fileIds.has(id) || program?.getSourceFile(id) === undefined) {
				program = ts.createProgram(
					[id, ...fileIds],
					{},
					undefined,
					program,
				);
				transformer = createTransformer(program);
			}
			fileIds.add(id);

			const file = program.getSourceFile(id)!;
			const result = ts.transform(file, [transformer]);
			return printer.printFile(result.transformed[0]);
		},
	} satisfies Plugin;
}