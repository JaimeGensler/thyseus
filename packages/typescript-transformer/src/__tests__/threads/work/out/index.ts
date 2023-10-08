self.addEventListener('message', async __e => {
	const { key: __k, value: __v, id: __i } = __e.data;
	if (__k === 'val') {
		val = __v;
		self.postMessage({ id: __i, result: undefined });
		return;
	}
	if (__k === 'myFunc') {
		const __r = await myFunc(...__v);
		self.postMessage({ id: __i, result: __r });
		return;
	}
	if (__k === 'temp') {
		const __r = await temp(...__v);
		self.postMessage({ id: __i, result: __r });
		return;
	}
});
export let val = true;
export const myFunc = () => {};
export function temp() {}
