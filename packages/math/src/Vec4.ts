/**
 * A 4-dimensional vector
 */
export class Vec4 {
	x: number;
	y: number;
	z: number;
	w: number;
	constructor(x = 0, y = 0, z = 0, w = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	/**
	 * The magnitude of this vector
	 */
	get magnitude(): number {
		return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2);
	}
	/**
	 * The _squared_ magnitude of this vector
	 */
	get squaredMagnitude(): number {
		return this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2;
	}

	/**
	 * Clones this vector, creating a new one with the same values.
	 * @returns A new vector with this vector's values
	 */
	clone(): Vec4 {
		return new Vec4(this.x, this.y, this.z, this.w);
	}

	/**
	 * Copies the values from another vector into this vector.
	 * @param other The vector to copy from
	 * @returns `this`
	 */
	copy(other: Readonly<Vec4>): this {
		this.x = other.x;
		this.y = other.y;
		this.z = other.z;
		this.w = other.w;
		return this;
	}

	/**
	 * Sets the components of this vector.
	 * @param x The new x component
	 * @param y The new y component
	 * @param z The new z component
	 * @param w The new w component
	 * @returns `this`
	 */
	set(x: number, y: number, z: number, w: number): this {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
		return this;
	}

	/**
	 * Adds another vector to this vector.
	 * @param other The other vector to add
	 * @returns `this`
	 */
	add(other: Readonly<Vec4>): this {
		this.x += other.x;
		this.y += other.y;
		this.z += other.z;
		this.w += other.w;
		return this;
	}

	/**
	 * Subtracts another vector from this vector.
	 * @param other The other vector to subtract
	 * @returns `this`
	 */
	subtract(other: Readonly<Vec4>): this {
		this.x -= other.x;
		this.y -= other.y;
		this.z -= other.z;
		this.w -= other.w;
		return this;
	}

	/**
	 * Multiplies each component of this vector by the provided value.
	 * @param scalar The scalar value to multiply components by
	 * @returns `this`
	 */
	scale(scalar: number): this {
		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
		this.w *= scalar;
		return this;
	}

	/**
	 * Adds the scaled components of another vector to this vector.
	 * @param other The other vector to add
	 * @param scalar The factor by which to scale the components
	 * @returns `this`
	 */
	addScaled(other: Readonly<Vec4>, scalar: number): this {
		this.x += other.x * scalar;
		this.y += other.y * scalar;
		this.z += other.z * scalar;
		this.w += other.w * scalar;
		return this;
	}

	/**
	 * Performs a component-wise multiplication of this vector and another vector.
	 * @param other The vector to multiply by
	 * @returns `this`
	 */
	multiply(other: Readonly<Vec4>): this {
		this.x *= other.x;
		this.y *= other.y;
		this.z *= other.z;
		this.w *= other.w;
		return this;
	}

	/**
	 * Calculates the dot product of this vector and another vector.
	 * @param other The vector to calculate the dot product against
	 * @returns The dot product
	 */
	dot(other: Readonly<Vec4>): number {
		return (
			this.x * other.x +
			this.y * other.y +
			this.z * other.z +
			this.w * other.w
		);
	}

	/**
	 * Gets the distance from this vector to another vector.
	 * @param other The vector to compare against
	 * @returns The distance between these vectors
	 */
	distanceTo(other: Readonly<Vec4>): number {
		return Math.sqrt(this.squaredDistanceTo(other));
	}

	/**
	 * Gets the _squared_ distance from this vector to another vector.
	 * @param other The vector to compare against
	 * @returns The squared distance between these vectors
	 */
	squaredDistanceTo(other: Readonly<Vec4>): number {
		const x = this.x - other.x;
		const y = this.y - other.y;
		const z = this.z - other.z;
		const w = this.w - other.w;
		return x ** 2 + y ** 2 + z ** 2 + w ** 2;
	}

	/**
	 * Normalizes this vector, setting its magnitude to 1 while maintaining its direction.
	 * If this vector has a magnitude of 0, does nothing.
	 */
	normalize(): this {
		const { magnitude } = this;
		if (magnitude !== 0) {
			this.scale(1 / magnitude);
		}
		return this;
	}

	/**
	 * Linearly interpolates from this vector to a target vector.
	 * @param target The target vector
	 * @param t The timestep for interpolation
	 * @returns `this`
	 */
	lerp(target: Readonly<Vec4>, t: number): this {
		this.x += t * (target.x - this.x);
		this.y += t * (target.y - this.y);
		this.z += t * (target.z - this.z);
		this.w += t * (target.w - this.w);
		return this;
	}

	/**
	 * Determines if all components of this vector are identical to all components of another vector.
	 * @param other The Vec4 to compare against
	 * @returns A boolean indicating if these vectors are equivalent
	 */
	equals(other: Readonly<Vec4>): boolean {
		return (
			this.x === other.x &&
			this.y === other.y &&
			this.z === other.z &&
			this.w === other.w
		);
	}

	*[Symbol.iterator](): IterableIterator<number> {
		yield this.x;
		yield this.y;
		yield this.z;
		yield this.w;
	}

	/**
	 * Returns a string representation of this vector.
	 */
	toString(): string {
		return `${this.constructor.name}(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
	}
}
