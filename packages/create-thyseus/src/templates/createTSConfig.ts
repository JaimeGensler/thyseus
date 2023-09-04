const globalInsert = '"types": ["thyseus/globals"],';

export function createTSConfig(useGlobalTypes: boolean) {
	return `
{
	"compilerOptions": {
		"module": "esnext",
		"target": "esnext",
		"moduleResolution": "node",
		"lib": ["dom", "DOM.Iterable", "ESNext"],
		"strict": true,
		"noImplicitAny": true,
		"forceConsistentCasingInFileNames": true,
		"isolatedModules": true,
		"outDir": "dist",
		"declaration": true${useGlobalTypes ? ',' : ''}
		${useGlobalTypes ? globalInsert : ''}
	},
	"exclude": ["node_modules"],
	"include": ["src/**/*.d.ts", "src/**/*.ts"]
}
`.trim();
}
