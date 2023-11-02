/**
 * Given an array, swaps the element at the provided index with the last element, and then pops the now-last element off the array.
 * @param array The array to modify.
 * @param index The index to swap and remove.
 * @returns The element that was removed.
 */
export function swapRemove<T>(array: T[], index: number): T | undefined {
	const temp = array[index];
	array[index] = array[array.length - 1];
	array.pop();
	return temp;
}
