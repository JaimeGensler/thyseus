#!/usr/bin/env node

// src/index.ts
import inquirer from "inquirer";
import { existsSync, mkdirSync, writeFileSync } from "fs";

// src/templates/createPackageJson.ts
import axios from "axios";
async function getLatest(packageName) {
  let version;
  try {
    const res = await axios.get(
      "https://registry.npmjs.org/" + packageName + "/latest"
    );
    version = res.data.version;
  } catch (e) {
    throw new Error(
      `Error fetching latest version for package "${packageName}"`
    );
  }
  return version;
}
async function createPackageJson(projectName) {
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
		"thyseus": "^${await getLatest("thyseus")}"
	},
	"devDependencies": {
		"@thyseus/rollup-plugin-thyseus": "^${await getLatest(
    "@thyseus/rollup-plugin-thyseus"
  )}",
		"typescript": "^${await getLatest("typescript")}",
		"vite": "^${await getLatest("vite")}"
	}
}
`.trim();
}

// src/templates/createReadme.ts
function createReadme(projectName) {
  return `
# ${projectName}

Scaffolded with \`create-thyseus-app\`!
`.trim();
}

// src/templates/createTSConfig.ts
var globalInsert = '"types": ["thyseus/globals"],';
function createTSConfig(useGlobalTypes) {
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
		"declaration": true${useGlobalTypes ? "," : ""}
		${useGlobalTypes ? globalInsert : ""}
	},
	"exclude": ["node_modules"],
	"include": ["src/**/*.d.ts", "src/**/*.ts"]
}
`.trim();
}

// src/templates/getIndexHTML.ts
function getIndexHTML(projectName) {
  return `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${projectName}</title>
	</head>
	<body>
		<script src="./src/index.ts" type="module"></script>
	</body>
</html>
`.trim();
}

// src/templates/gitIgnore.ts
var gitIgnore = `
node_modules/
dist/
.DS_Store
`.trim();

// src/templates/viteConfig.ts
var viteConfig = `
import { thyseus } from '@thyseus/rollup-plugin-thyseus';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [thyseus()],
});
`.trim();

// src/templates/indexTS.ts
var indexTS = `
import { World, StartSchedule, DefaultSchedule } from 'thyseus';

function start(world: World) {
	async function loop() {
		await world.runSchedule(DefaultSchedule);
		requestAnimationFrame(loop);
	}
	loop();
}
function helloWorld() {
	console.log('Hello, world!');
}

const world = await World.new()
	.addSystemsToSchedule(StartSchedule, start)
	.addSystems(helloWorld, /* Your systems here! */)
	.build();

world.start();
`.trim();

// src/index.ts
var packageNameRegexp = /^(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)?\/)?[a-z0-9-~][a-z0-9-._~]*$/;
inquirer.prompt([
  {
    name: "projectName",
    message: "What's your project's name?",
    type: "string",
    validate(projectName) {
      if (existsSync(projectName)) {
        return "A project of that name already exists!";
      }
      if (!packageNameRegexp.test(projectName)) {
        return "Project does not have a valid name!";
      }
      return true;
    }
  },
  {
    name: "useGlobalTypes",
    message: "Use Thyseus's global type injection?",
    type: "confirm",
    default: true
  }
]).then(async function({ projectName, useGlobalTypes }) {
  mkdirSync(projectName);
  mkdirSync(`${projectName}/src`);
  writeFileSync(
    `${projectName}/package.json`,
    await createPackageJson(projectName)
  );
  writeFileSync(
    `${projectName}/tsconfig.json`,
    createTSConfig(useGlobalTypes)
  );
  writeFileSync(`${projectName}/.gitignore`, gitIgnore);
  writeFileSync(`${projectName}/vite.config.ts`, viteConfig);
  writeFileSync(`${projectName}/index.html`, getIndexHTML(projectName));
  writeFileSync(`${projectName}/README.md`, createReadme(projectName));
  writeFileSync(`${projectName}/src/index.ts`, indexTS);
  console.log(`Done! Run "cd ${projectName} && pnpm i" and enjoy!`);
}).catch(console.error);
