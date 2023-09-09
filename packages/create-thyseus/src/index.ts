#!/usr/bin/env node
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import {
	createPackageJson,
	createTSConfig,
	gitIgnore,
	indexTS,
	viteConfig,
	getIndexHTML,
	createReadme,
} from './templates';

type Answers = {
	projectName: string;
	useGlobalTypes: true;
};

const packageNameRegexp =
	/^(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)?\/)?[a-z0-9-~][a-z0-9-._~]*$/;
inquirer
	.prompt([
		{
			name: 'projectName',
			message: "What's your project's name?",
			type: 'string',
			validate(projectName: string) {
				if (existsSync(projectName)) {
					return 'A project of that name already exists!';
				}
				if (!packageNameRegexp.test(projectName)) {
					return 'Project does not have a valid name!';
				}
				return true;
			},
		},
		{
			name: 'useGlobalTypes',
			message: "Use Thyseus's global type injection?",
			type: 'confirm',
			default: false,
		},
	])
	.then(async function ({ projectName, useGlobalTypes }: Answers) {
		mkdirSync(projectName);
		mkdirSync(`${projectName}/src`);

		writeFileSync(
			`${projectName}/package.json`,
			await createPackageJson(projectName),
		);
		writeFileSync(
			`${projectName}/tsconfig.json`,
			createTSConfig(useGlobalTypes),
		);
		writeFileSync(`${projectName}/.gitignore`, gitIgnore);
		writeFileSync(`${projectName}/vite.config.ts`, viteConfig);
		writeFileSync(`${projectName}/index.html`, getIndexHTML(projectName));
		writeFileSync(`${projectName}/README.md`, createReadme(projectName));
		writeFileSync(`${projectName}/src/index.ts`, indexTS);

		console.log(`Done! Run "cd ${projectName} && pnpm i" and enjoy!`);
	})
	.catch(console.error);
