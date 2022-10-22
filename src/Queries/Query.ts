export interface Query<C extends object> {
	[Symbol.iterator](): Iterator<C>;
}
