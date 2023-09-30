// Adapted from https://stackoverflow.com/questions/54520676/in-typescript-how-to-get-the-keys-of-an-object-type-whose-values-are-of-a-given
type MethodKeys<T extends object> = {
	[K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];
type ArgumentsType<T> = T extends (...args: infer R) => any ? R : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

export class Thread<T extends object> {
	#worker: Worker;

	constructor(url: string) {
		this.#worker = new Worker(url);
	}

	run<K extends MethodKeys<T>>(
		methodName: K,
		...args: ArgumentsType<T[K]>
	): Promise<ReturnType<T[K]>> {
		return new Promise(r => r(0 as any));
	}

	runSystem(system: any): Promise<void> {
		return new Promise(r => r(0 as any));
	}
	runSchedule(schedule: any) {}
}

class Calc {
	otherValue: number = 0;
	fibonacci(n: number): number {
		// this is right sometimes at least
		return 1;
	}
	cubeRoot(a: string, b: string): string {
		return '';
	}
}

function mySystem() {}
async function whatever(thread: Thread<Calc>) {
	const x = await thread.run('fibonacci', 0);
	const y = await thread.run('cubeRoot', '', '');
}
