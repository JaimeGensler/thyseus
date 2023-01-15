import { createStore } from '../storage';

export function initStruct(instance: object) {
	// TODO: Rework createStore to accept an arraybuffer constructor?
	//@ts-ignore
	instance.__$$s ??= createStore({} as any, instance.constructor, 1);
	//@ts-ignore
	instance.__$$b ??= 0;
}
