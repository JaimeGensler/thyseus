import { Commands } from '../commands';

('use thread');

export function mySystem(commands: Commands) {}
export function adder(a: number, b: number): number {
	return a + b;
}
export function argless() {}

export let canvas: OffscreenCanvas;
