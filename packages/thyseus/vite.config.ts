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
				// descriptors: resolve(__dirname, 'src/descriptors.ts'),
			},
			name: 'Thyseus',
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
