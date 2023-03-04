/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	build: {
		target: 'esnext',
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'Thyseus',
			fileName: 'index',
		},
		rollupOptions: {
			external: ['esm-env'],
			output: {
				exports: 'named',
				globals: {
					'esm-env': 'esm_env',
				},
			},
		},
	},
	define: {
		'import.meta.vitest': 'undefined',
	},
	test: {
		includeSource: ['src/**/*.{js,ts}'],
		setupFiles: ['@vitest/web-worker'],
	},
});
