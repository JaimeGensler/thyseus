export function swapRemove<T>(array: T[], index: number): T | undefined {
	const lastIndex = array.length - 1;
	const temp = array[index];
	array[index] = array[lastIndex];
	array[lastIndex] = temp;
	return array.pop();
}
