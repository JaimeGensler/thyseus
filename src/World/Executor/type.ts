export default interface Executor {
	add(sid: number): void;
	start(): void;
	iter(local: Set<number>): AsyncGenerator<number, void, unknown>;

	onReady(callback: () => void): Promise<void>;
	reset(): void;
}
