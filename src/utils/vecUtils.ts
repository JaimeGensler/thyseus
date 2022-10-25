export const vecUtils = {
	push(vec: Uint16Array, value: number): void {
		vec[vec[vec.length - 1]] = value;
		vec[vec.length - 1]++;
	},
	size(vec: Uint16Array): number {
		return vec[vec.length - 1];
	},
	*iter(vec: Uint16Array) {
		const size = vec[vec.length - 1];
		for (let i = 0; i < size; i++) {
			yield vec[i];
		}
	},
	delete(vec: Uint16Array, index: number): void {
		vec[index] = vec[vec.length - 1];
		vec[vec.length - 1]--;
	},
};
