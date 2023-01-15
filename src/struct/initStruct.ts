import { createStore } from '../storage';

export function initStruct(instance: object) {
	//@ts-ignore
	instance.__$$s ??= createStore(ArrayBuffer, instance.constructor, 1);
	//@ts-ignore
	instance.__$$b ??= 0;
}
