/**
 * Clamps the provided `value` so it will be between `min` and `max`.
 * @param min The minimum permitted value.
 * @param value The value to clamp.
 * @param max The maximum permitted value.
 * @returns The clamped value.
 */
export function clamp(min: number, value: number, max: number) {
	return Math.max(min, Math.min(value, max));
}
