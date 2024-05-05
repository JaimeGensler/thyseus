import { EPSILON } from './constants';
import type { Vec3 } from './Vec3';
import type { Quat } from './Quat';

/**
 * A 4x4 matrix backed by a `Float32Array`.
 */
export class Mat4 extends Float32Array {
	static IDENTITY = new Mat4();
	/**
	 * The size, in bytes, of a single Mat4.
	 */
	static get SIZE(): 64 {
		return 64;
	}
	/**
	 * The alignment, in bytes, of a Mat4.
	 */
	static get ALIGNMENT(): 4 {
		return 4;
	}

	constructor();
	constructor(buffer: ArrayBufferLike, byteOffset?: number);
	constructor(elements: ArrayLike<number>);
	constructor(
		bufferOrElements: ArrayBufferLike | ArrayLike<number> = new ArrayBuffer(
			64,
		),
		byteOffset: number = 0,
	) {
		if ('length' in bufferOrElements) {
			super(16);
			this.set(bufferOrElements);
		} else if (bufferOrElements) {
			super(bufferOrElements, byteOffset, 16);
			this.identity();
		}
	}

	/**
	 * Copies the values from another matrix into this matrix.
	 * @param other The matrix to copy from.
	 * @returns `this`
	 */
	copy(other: Readonly<Mat4>): this {
		this.set(other);
		return this;
	}

	/**
	 * Clones this matrix, creating a new one with the same values.
	 * @returns A new matrix with this matrix's values.
	 */
	clone(): Mat4 {
		return new Mat4(this);
	}

	/**
	 * Sets this `Mat4` to the identity matrix.
	 * @returns `this`
	 */
	identity(): this {
		this.set(Mat4.IDENTITY);
		return this;
	}

	/**
	 * Generates a perspective projection matrix with the provided constraints.
	 *
	 * The near/far clip planes correspond to normalized device coordinate Z range of [0, 1],
	 * matching WebGPU's clip volume.
	 *
	 * @param fovy The  vertical field of view (in radians).
	 * @param aspect The aspect ratio.
	 * @param near Near bound of the frustum.
	 * @param far Far bound of the frustum (may be `Infinity`).
	 * @returns `this`
	 */
	perspective(
		fovy: number,
		aspect: number,
		near: number,
		far: number = Infinity,
	): this {
		const f = 1.0 / Math.tan(fovy / 2);
		this.fill(0);
		this[0] = f / aspect;
		this[5] = f;
		this[11] = -1;
		if (far === Infinity) {
			this[10] = -1;
			this[14] = -near;
		} else {
			const nf = 1 / (near - far);
			this[10] = far * nf;
			this[14] = far * near * nf;
		}
		return this;
	}

	/**
	 * Generates an orthographic projection matrix with the given bounds.
	 *
	 * The near/far clip planes correspond to normalized device coordinate Z range of [0, 1],
	 * matching WebGPU's clip volume.
	 *
	 * @param left - Left bound of the frustum.
	 * @param right - Right bound of the frustum.
	 * @param bottom - Bottom bound of the frustum.
	 * @param top - Top bound of the frustum.
	 * @param near - Near bound of the frustum.
	 * @param far - Far bound of the frustum.
	 * @returns `this`
	 */
	orthographic(
		left: number,
		right: number,
		bottom: number,
		top: number,
		near: number,
		far: number,
	): this {
		const lr = 1 / (left - right);
		const bt = 1 / (bottom - top);
		const nf = 1 / (near - far);
		this.fill(0);
		this[0] = -2 * lr;
		this[5] = -2 * bt;
		this[10] = nf;
		this[12] = (left + right) * lr;
		this[13] = (top + bottom) * bt;
		this[14] = near * nf;
		this[15] = 1;
		return this;
	}

	/**
	 * Adds this matrix to another matrix by components.
	 * @param other The matrix to add to this matrix.
	 * @returns `this`
	 */
	add(other: Readonly<Mat4>): this {
		this[0] += other[0];
		this[1] += other[1];
		this[2] += other[2];
		this[3] += other[3];
		this[4] += other[4];
		this[5] += other[5];
		this[6] += other[6];
		this[7] += other[7];
		this[8] += other[8];
		this[9] += other[9];
		this[10] += other[10];
		this[11] += other[11];
		this[12] += other[12];
		this[13] += other[13];
		this[14] += other[14];
		this[15] += other[15];
		return this;
	}

	/**
	 * Multiples this matrix by another matrix.
	 * @param other The matrix to multiply this matrix by.
	 * @returns `this`
	 */
	multiply(other: Readonly<Mat4>): this {
		const [
			a00,
			a01,
			a02,
			a03,
			a10,
			a11,
			a12,
			a13,
			a20,
			a21,
			a22,
			a23,
			a30,
			a31,
			a32,
			a33,
		] = this;

		// Cache only the current line of the second matrix
		let [b0, b1, b2, b3] = other;
		this[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		this[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		this[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		this[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		[, , , , b0, b1, b2, b3] = other;
		this[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		this[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		this[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		this[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		[, , , , , , , , b0, b1, b2, b3] = other;
		this[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		this[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		this[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		this[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		[, , , , , , , , , , , , b0, b1, b2, b3] = other;
		this[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		this[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		this[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		this[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
		return this;
	}

	transpose(): this {
		const a01 = this[1];
		const a02 = this[2];
		const a03 = this[3];
		const a12 = this[6];
		const a13 = this[7];
		const a23 = this[11];
		this[1] = this[4];
		this[2] = this[8];
		this[3] = this[12];
		this[4] = a01;
		this[6] = this[9];
		this[7] = this[13];
		this[8] = a02;
		this[9] = a12;
		this[11] = this[14];
		this[12] = a03;
		this[13] = a13;
		this[14] = a23;
		return this;
	}

	determinant(): number {
		const [
			a00,
			a01,
			a02,
			a03,
			a10,
			a11,
			a12,
			a13,
			a20,
			a21,
			a22,
			a23,
			a30,
			a31,
			a32,
			a33,
		] = this;

		const b0 = a00 * a11 - a01 * a10;
		const b1 = a00 * a12 - a02 * a10;
		const b2 = a01 * a12 - a02 * a11;
		const b3 = a20 * a31 - a21 * a30;
		const b4 = a20 * a32 - a22 * a30;
		const b5 = a21 * a32 - a22 * a31;
		const b6 = a00 * b5 - a01 * b4 + a02 * b3;
		const b7 = a10 * b5 - a11 * b4 + a12 * b3;
		const b8 = a20 * b2 - a21 * b1 + a22 * b0;
		const b9 = a30 * b2 - a31 * b1 + a32 * b0;

		return a13 * b6 - a03 * b7 + a33 * b8 - a23 * b9;
	}

	/**
	 * Inverts this matrix.
	 *
	 * @returns `this`
	 */
	invert(): this {
		const [
			a00,
			a01,
			a02,
			a03,
			a10,
			a11,
			a12,
			a13,
			a20,
			a21,
			a22,
			a23,
			a30,
			a31,
			a32,
			a33,
		] = this;

		const b00 = a00 * a11 - a01 * a10;
		const b01 = a00 * a12 - a02 * a10;
		const b02 = a00 * a13 - a03 * a10;
		const b03 = a01 * a12 - a02 * a11;
		const b04 = a01 * a13 - a03 * a11;
		const b05 = a02 * a13 - a03 * a12;
		const b06 = a20 * a31 - a21 * a30;
		const b07 = a20 * a32 - a22 * a30;
		const b08 = a20 * a33 - a23 * a30;
		const b09 = a21 * a32 - a22 * a31;
		const b10 = a21 * a33 - a23 * a31;
		const b11 = a22 * a33 - a23 * a32;

		let det =
			b00 * b11 -
			b01 * b10 +
			b02 * b09 +
			b03 * b08 -
			b04 * b07 +
			b05 * b06;

		if (det === 0) {
			return this;
		}
		det = 1 / det;

		this[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
		this[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
		this[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
		this[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
		this[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
		this[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
		this[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
		this[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
		this[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
		this[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
		this[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
		this[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
		this[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
		this[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
		this[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
		this[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

		return this;
	}

	/**
	 * Calculates the adjugate of this matrix
	 *
	 * @returns `this`
	 */
	adjoint(): this {
		const [
			a00,
			a01,
			a02,
			a03,
			a10,
			a11,
			a12,
			a13,
			a20,
			a21,
			a22,
			a23,
			a30,
			a31,
			a32,
			a33,
		] = this;

		const b00 = a00 * a11 - a01 * a10;
		const b01 = a00 * a12 - a02 * a10;
		const b02 = a00 * a13 - a03 * a10;
		const b03 = a01 * a12 - a02 * a11;
		const b04 = a01 * a13 - a03 * a11;
		const b05 = a02 * a13 - a03 * a12;
		const b06 = a20 * a31 - a21 * a30;
		const b07 = a20 * a32 - a22 * a30;
		const b08 = a20 * a33 - a23 * a30;
		const b09 = a21 * a32 - a22 * a31;
		const b10 = a21 * a33 - a23 * a31;
		const b11 = a22 * a33 - a23 * a32;

		this[0] = a11 * b11 - a12 * b10 + a13 * b09;
		this[1] = a02 * b10 - a01 * b11 - a03 * b09;
		this[2] = a31 * b05 - a32 * b04 + a33 * b03;
		this[3] = a22 * b04 - a21 * b05 - a23 * b03;
		this[4] = a12 * b08 - a10 * b11 - a13 * b07;
		this[5] = a00 * b11 - a02 * b08 + a03 * b07;
		this[6] = a32 * b02 - a30 * b05 - a33 * b01;
		this[7] = a20 * b05 - a22 * b02 + a23 * b01;
		this[8] = a10 * b10 - a11 * b08 + a13 * b06;
		this[9] = a01 * b08 - a00 * b10 - a03 * b06;
		this[10] = a30 * b04 - a31 * b02 + a33 * b00;
		this[11] = a21 * b02 - a20 * b04 - a23 * b00;
		this[12] = a11 * b07 - a10 * b09 - a12 * b06;
		this[13] = a00 * b09 - a01 * b07 + a02 * b06;
		this[14] = a31 * b01 - a30 * b03 - a32 * b00;
		this[15] = a20 * b03 - a21 * b01 + a22 * b00;
		return this;
	}

	/**
	 * Generates a look-at matrix given an eye position, focal point, and up axis.
	 *
	 * @param eye The position or eye of the viewer.
	 * @param focalPoint The point to look at.
	 * @param up The up direction.
	 * @returns `this`
	 */
	lookAt(
		eye: Readonly<Vec3>,
		focalPoint: Readonly<Vec3>,
		up: Readonly<Vec3>,
	): this {
		const { x: eyex, y: eyey, z: eyez } = eye;
		const { x: upx, y: upy, z: upz } = up;
		const { x: centerx, y: centery, z: centerz } = focalPoint;

		if (
			Math.abs(eyex - centerx) < EPSILON &&
			Math.abs(eyey - centery) < EPSILON &&
			Math.abs(eyez - centerz) < EPSILON
		) {
			return this.identity();
		}

		let z0 = eyex - centerx;
		let z1 = eyey - centery;
		let z2 = eyez - centerz;

		let len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
		z0 *= len;
		z1 *= len;
		z2 *= len;

		let x0 = upy * z2 - upz * z1;
		let x1 = upz * z0 - upx * z2;
		let x2 = upx * z1 - upy * z0;
		len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
		if (!len) {
			x0 = 0;
			x1 = 0;
			x2 = 0;
		} else {
			len = 1 / len;
			x0 *= len;
			x1 *= len;
			x2 *= len;
		}

		let y0 = z1 * x2 - z2 * x1;
		let y1 = z2 * x0 - z0 * x2;
		let y2 = z0 * x1 - z1 * x0;

		len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
		if (!len) {
			y0 = 0;
			y1 = 0;
			y2 = 0;
		} else {
			len = 1 / len;
			y0 *= len;
			y1 *= len;
			y2 *= len;
		}

		this[0] = x0;
		this[1] = y0;
		this[2] = z0;
		this[3] = 0;
		this[4] = x1;
		this[5] = y1;
		this[6] = z1;
		this[7] = 0;
		this[8] = x2;
		this[9] = y2;
		this[10] = z2;
		this[11] = 0;
		this[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
		this[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
		this[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
		this[15] = 1;

		return this;
	}

	/**
	 * Translate a matrix by the provided vector.
	 *
	 * @param v The vector to translate this matrix by
	 * @returns `this`
	 */
	translate(translation: Readonly<Vec3>): this {
		const { x, y, z } = translation;
		this[12] = this[0] * x + this[4] * y + this[8] * z + this[12];
		this[13] = this[1] * x + this[5] * y + this[9] * z + this[13];
		this[14] = this[2] * x + this[6] * y + this[10] * z + this[14];
		this[15] = this[3] * x + this[7] * y + this[11] * z + this[15];
		return this;
	}

	/**
	 * Scales this matrix by the provided vector.
	 * @param param0 The vector to scale this matrix by
	 * @returns `this`
	 */
	scale({ x, y, z }: Readonly<Vec3>): this {
		this[0] *= x;
		this[1] *= x;
		this[2] *= x;
		this[3] *= x;
		this[4] *= y;
		this[5] *= y;
		this[6] *= y;
		this[7] *= y;
		this[8] *= z;
		this[9] *= z;
		this[10] *= z;
		this[11] *= z;
		return this;
	}

	/**
	 * Sets this matrix to be a composition of the provided translation, rotation, and scale.
	 * @param translation The translation (position) to set for this matrix.
	 * @param rotation The rotation to set for this matrix.
	 * @param scale The scale to set for this matrix.
	 * @returns `this`
	 */
	compose(
		translation: Readonly<Vec3>,
		rotation: Readonly<Quat>,
		scale: Readonly<Vec3>,
	): this {
		const { x, y, z, w } = rotation;
		const { x: scaleX, y: scaleY, z: scaleZ } = scale;
		const {
			x: translationX,
			y: translationY,
			z: translationZ,
		} = translation;
		const x2 = x + x;
		const y2 = y + y;
		const z2 = z + z;

		const xx = x * x2;
		const xy = x * y2;
		const xz = x * z2;
		const yy = y * y2;
		const yz = y * z2;
		const zz = z * z2;
		const wx = w * x2;
		const wy = w * y2;
		const wz = w * z2;
		const sx = scaleX;
		const sy = scaleY;
		const sz = scaleZ;

		this[0] = (1 - (yy + zz)) * sx;
		this[1] = (xy + wz) * sx;
		this[2] = (xz - wy) * sx;
		this[3] = 0;
		this[4] = (xy - wz) * sy;
		this[5] = (1 - (xx + zz)) * sy;
		this[6] = (yz + wx) * sy;
		this[7] = 0;
		this[8] = (xz + wy) * sz;
		this[9] = (yz - wx) * sz;
		this[10] = (1 - (xx + yy)) * sz;
		this[11] = 0;
		this[12] = translationX;
		this[13] = translationY;
		this[14] = translationZ;
		this[15] = 1;

		return this;
	}

	/**
	 * Rotates this matrix by the provided angle around the provided axis.
	 *
	 * @param radians The angle to rotate this matrix by.
	 * @param axis The axis to rotate this matrix around.
	 * @returns `this`
	 */
	rotate(radians: number, axis: Readonly<Vec3>): this {
		let { x, y, z } = axis;

		const length = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
		if (length < EPSILON) {
			return this;
		}

		x /= length;
		y /= length;
		z /= length;

		const s = Math.sin(radians);
		const c = Math.cos(radians);
		const t = 1 - c;
		const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23] =
			this;

		const b00 = x * x * t + c;
		const b01 = y * x * t + z * s;
		const b02 = z * x * t - y * s;
		const b10 = x * y * t - z * s;
		const b11 = y * y * t + c;
		const b12 = z * y * t + x * s;
		const b20 = x * z * t + y * s;
		const b21 = y * z * t - x * s;
		const b22 = z * z * t + c;

		this[0] = a00 * b00 + a10 * b01 + a20 * b02;
		this[1] = a01 * b00 + a11 * b01 + a21 * b02;
		this[2] = a02 * b00 + a12 * b01 + a22 * b02;
		this[3] = a03 * b00 + a13 * b01 + a23 * b02;
		this[4] = a00 * b10 + a10 * b11 + a20 * b12;
		this[5] = a01 * b10 + a11 * b11 + a21 * b12;
		this[6] = a02 * b10 + a12 * b11 + a22 * b12;
		this[7] = a03 * b10 + a13 * b11 + a23 * b12;
		this[8] = a00 * b20 + a10 * b21 + a20 * b22;
		this[9] = a01 * b20 + a11 * b21 + a21 * b22;
		this[10] = a02 * b20 + a12 * b21 + a22 * b22;
		this[11] = a03 * b20 + a13 * b21 + a23 * b22;
		return this;
	}

	/**
	 * Determines if all components of this matrix are identical to all components of another matrix.
	 * @param other The matrix to compare against.
	 * @returns A boolean indicating if these matrices are equivalent.
	 */
	equals(other: Readonly<Mat4>): boolean {
		return (
			this[0] === other[0] &&
			this[1] === other[1] &&
			this[2] === other[2] &&
			this[3] === other[3] &&
			this[4] === other[4] &&
			this[5] === other[5] &&
			this[6] === other[6] &&
			this[7] === other[7] &&
			this[8] === other[8] &&
			this[9] === other[9] &&
			this[10] === other[10] &&
			this[11] === other[11] &&
			this[12] === other[12] &&
			this[13] === other[13] &&
			this[14] === other[14] &&
			this[15] === other[15]
		);
	}

	/**
	 * Returns a string representation of this matrix.
	 */
	toString(): string {
		return `${this.constructor.name}(${this.join(', ')})`;
	}
}
