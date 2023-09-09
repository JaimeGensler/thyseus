import axios from 'axios';

// Adapted from https://blog.tannernielsen.com/2019/02/18/using-the-npm-api-to-get-latest-package-versions
export async function getLatest(packageName: string) {
	let version: string;
	try {
		const res = await axios.get(
			'https://registry.npmjs.org/' + packageName + '/latest',
		);
		version = res.data.version;
	} catch (e) {
		throw new Error(
			`Error fetching latest version for package "${packageName}"`,
		);
	}
	return version;
}

export async function createPackageJson(projectName: string) {
	return `
{
	"name": "${projectName}",
	"version": "0.1.0",
	"description": "",
	"author": "",
	"license": "MIT",
	"main": "src/index.ts",
	"type": "module",
	"scripts": {
		"dev": "vite",
		"build": "vite build"
	},
	"keywords": [],
	"dependencies": {
		"thyseus": "^${await getLatest('thyseus')}"
	},
	"devDependencies": {
		"@thyseus/rollup-plugin-thyseus": "^${await getLatest(
			'@thyseus/rollup-plugin-thyseus',
		)}",
		"typescript": "^${await getLatest('typescript')}",
		"vite": "^${await getLatest('vite')}"
	}
}
`.trim();
}
