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
			name: 'thyseus-math',
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
