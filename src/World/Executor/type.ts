export default interface Executor {
	add(sid: number): void;
	start(): void;
	whenReady(callback: () => void): void;
	iter(local: Set<number>): AsyncGenerator<number, void, unknown>;
}
