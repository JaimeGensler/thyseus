/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: { target: 'es2020' },
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
	test: {
		includeSource: ['src/**/*.{js,ts}'],
		setupFiles: ['@vitest/web-worker'],
	},
});
