import { Vec3 } from './Vec3';

/**
 * The mathematical constant Pi (`π`) -
 * equivalent to `3.141592653589793`.
 */
export const PI = Math.PI;
/**
 * Half of the mathematical constant Pi -
 * equivalent to `π/2` or `1.5707963267948966`.
 */
export const HALF_PI = 1.5707963267948966;
/**
 * The mathematical constant Tau (`τ`) -
 * equivalent to `2π`, or `6.283185307179586`.
 */
export const TAU = 6.283185307179586;

export const EPSILON = 0.000001;

/**
 * The origin in 3D space -
 * `Vec3(0, 0, 0)`
 */
export const ORIGIN = new Vec3(0, 0, 0);

/**
 *  The cardinal direction of East - positive X - in 3D space.
 *
 * `Vec3(1, 0, 0)`
 */
export const EAST = new Vec3(1, 0, 0);
/**
 *  The direction of Up - positive Y - in 3D space.
 *
 * `Vec3(0, 1, 0)`
 */
export const UP = new Vec3(0, 1, 0);
/**
 *  The cardinal direction of North - positive Z - in 3D space.
 *
 * `Vec3(0, 0, 1)`
 */
export const NORTH = new Vec3(0, 0, 1);

/**
 *  The cardinal direction of West - negative X - in 3D space.
 *
 * `Vec3(-1, 0, 0)`
 */
export const WEST = new Vec3(-1, 0, 0);
/**
 *  The direction of Down - negative Y - in 3D space.
 * `Vec3(0, -1, 0)`
 */
export const DOWN = new Vec3(0, -1, 0);
/**
 *  The cardinal direction of South - negative Z - in 3D space.
 * `Vec3(0, 0, -1)`
 */
export const SOUTH = new Vec3(0, 0, -1);
