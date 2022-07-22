/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	build: {
		target: 'esnext',
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'Thyseus',
			fileName: 'thyseus',
		},
		rollupOptions: { output: { exports: 'named' } },
	},
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
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
