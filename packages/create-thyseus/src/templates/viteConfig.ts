export const viteConfig = `
import { thyseus } from '@thyseus/transformer-rollup';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [thyseus()],
});
`.trim();
