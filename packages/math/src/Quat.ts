import { Vec4 } from './Vec4';
import { EPSILON } from './constants';

export class Quat extends Vec4 {
	/**
	 * Clones this quaternion, creating a new one with the same values.
	 * @returns The new quaternion
	 */
	clone(): Quat {
		return new Quat(this.x, this.y, this.z, this.w);
	}

	/**
	 * Sets this quaternion to the identity quaternion.
	 * @returns `this`
	 */
	identity(): this {
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.w = 1;
		return this;
	}

	/**
	 * Sets this quaternion to its conjugate.
	 * @returns `this`
	 */
	conjugate(): this {
		this.x *= -1;
		this.y *= -1;
		this.z *= -1;
		return this;
	}

	/**
	 * Inverts this quaternion.
	 * @returns `this`
	 */
	invert(): this {
		const dot = this.dot(this);
		const invDot = dot !== 0 ? 1 / dot : 0;

		this.x *= -invDot;
		this.y *= -invDot;
		this.z *= -invDot;
		this.w *= invDot;
		return this;
	}

	/**
	 * Rotates this quaternion by the provided angle about the X axis.
	 * @param radians The angle - in radians - to rotate this quaternion by
	 * @returns `this`
	 */
	rotateX(radians: number): this {
		radians *= 0.5;

		const { x, y, z, w } = this;
		const bx = Math.sin(radians);
		const bw = Math.cos(radians);

		this.x = x * bw + w * bx;
		this.y = y * bw + z * bx;
		this.z = z * bw - y * bx;
		this.w = w * bw - x * bx;
		return this;
	}

	/**
	 * Rotates this quaternion by the provided angle about the Y axis.
	 * @param radians The angle - in radians - to rotate this quaternion by
	 * @returns `this`
	 */
	rotateY(radians: number): this {
		radians *= 0.5;

		const { x, y, z, w } = this;
		const by = Math.sin(radians);
		const bw = Math.cos(radians);

		this.x = x * bw - z * by;
		this.y = y * bw + w * by;
		this.z = z * bw + x * by;
		this.w = w * bw - y * by;
		return this;
	}

	/**
	 * Rotates this quaternion by the provided angle about the Z axis.
	 * @param radians The angle - in radians - to rotate this quaternion by
	 * @returns `this`
	 */
	rotateZ(radians: number): this {
		radians *= 0.5;

		const { x, y, z, w } = this;
		const bz = Math.sin(radians);
		const bw = Math.cos(radians);

		this.x = x * bw + y * bz;
		this.y = y * bw - x * bz;
		this.z = z * bw + w * bz;
		this.w = w * bw - z * bz;
		return this;
	}

	/**
	 * Multiplies this quaternion by another quaternion.
	 * @param other The quaternion to multiply this quaternion by
	 * @returns `this`
	 */
	multiply(other: Readonly<Quat>): this {
		const { x, y, z, w } = this;
		const { x: bx, y: by, z: bz, w: bw } = other;

		this.x = x * bw + w * bx + y * bz - z * by;
		this.y = y * bw + w * by + z * bx - x * bz;
		this.z = z * bw + w * bz + x * by - y * bx;
		this.w = w * bw - x * bx - y * by - z * bz;
		return this;
	}

	/**
	 * Spherical-linearly interpolates from this quaternion to a target quaternion.
	 * @param target The target vector
	 * @param t The timestep for interpolation
	 * @returns `this`
	 */
	slerp(target: Readonly<Quat>, t: number): this {
		const { x, y, z, w } = this;
		let { x: bx, y: by, z: bz, w: bw } = target;

		let scale0 = 0;
		let scale1 = 0;

		let cosom = x * bx + y * by + z * bz + w * bw;
		if (cosom < 0) {
			cosom = -cosom;
			bx = -bx;
			by = -by;
			bz = -bz;
			bw = -bw;
		}
		if (1 - cosom > EPSILON) {
			const omega = Math.acos(cosom);
			const sinom = Math.sin(omega);
			scale0 = Math.sin((1 - t) * omega) / sinom;
			scale1 = Math.sin(t * omega) / sinom;
		} else {
			scale0 = 1 - t;
			scale1 = t;
		}
		this.x = scale0 * x + scale1 * bx;
		this.y = scale0 * y + scale1 * by;
		this.z = scale0 * z + scale1 * bz;
		this.w = scale0 * w + scale1 * bw;

		return this;
	}
}
