/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	esbuild: {
		minifyIdentifiers: false,
	},
	build: {
		target: 'esnext',
		lib: {
			entry: {
				index: resolve(__dirname, 'src/index.ts'),
			},
			name: 'thyseus_transformer_rollup',
		},
		rollupOptions: {
			external: [
				'@thyseus/typescript-transformer',
				'typescript',
				'@rollup/pluginutils',
			],
			output: {
				exports: 'named',
				globals: {
					'@thyseus/typescript-transformer': 'thyseus_ts_transformer',
					typescript: 'ts',
				},
			},
		},
	},
});
