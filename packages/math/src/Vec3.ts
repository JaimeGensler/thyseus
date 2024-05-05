/**
 * A 3-dimensional vector
 */
export class Vec3 {
	x: number;
	y: number;
	z: number;
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	/**
	 * The magnitude of this vector
	 */
	get magnitude(): number {
		return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
	}
	/**
	 * The _squared_ magnitude of this vector
	 */
	get squaredMagnitude(): number {
		return this.x ** 2 + this.y ** 2 + this.z ** 2;
	}

	/**
	 * Clones this vector, creating a new one with the same values.
	 * @returns A new vector with this vector's values
	 */
	clone(): Vec3 {
		return new Vec3(this.x, this.y, this.z);
	}

	/**
	 * Copies the values from another vector into this vector.
	 * @param other The vector to copy from
	 * @returns `this`
	 */
	copy(other: Readonly<Vec3>): this {
		this.x = other.x;
		this.y = other.y;
		this.z = other.z;
		return this;
	}

	/**
	 * Sets the components of this vector.
	 * @param x The new x component
	 * @param y The new y component
	 * @param z The new z component
	 * @returns `this`
	 */
	set(x: number, y: number, z: number): this {
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	}

	/**
	 * Adds another vector to this vector.
	 * @param other The other vector to add
	 * @returns `this`
	 */
	add(other: Readonly<Vec3>): this {
		this.x += other.x;
		this.y += other.y;
		this.z += other.z;
		return this;
	}

	/**
	 * Subtracts another vector from this vector.
	 * @param other The other vector to subtract
	 * @returns `this`
	 */
	subtract(other: Readonly<Vec3>): this {
		this.x -= other.x;
		this.y -= other.y;
		this.z -= other.z;
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
		return this;
	}
	/**
	 * Adds the scaled components of another vector to this vector.
	 * @param other The other vector to add
	 * @param scalar The factor by which to scale the components
	 * @returns `this`
	 */
	addScaled(other: Readonly<Vec3>, scalar: number): this {
		this.x += other.x * scalar;
		this.y += other.y * scalar;
		this.z += other.z * scalar;
		return this;
	}

	/**
	 * Normalizes this vector, setting its magnitude to 1 while maintaining its direction.
	 * If this vector has a magnitude of 0, does nothing
	 */
	normalize(): this {
		const { magnitude } = this;
		if (magnitude !== 0) {
			this.scale(1 / magnitude);
		}
		return this;
	}

	/**
	 * Gets the distance from this vector to another vector.
	 * @param other The vector to compare against
	 * @returns The distance between these vectors
	 */
	distanceTo(other: Readonly<Vec3>): number {
		return Math.sqrt(this.squaredDistanceTo(other));
	}
	/**
	 * Gets the _squared_ distance from this vector to another vector.
	 * @param other The vector to compare against
	 * @returns The squared distance between these vectors
	 */
	squaredDistanceTo(other: Readonly<Vec3>): number {
		const x = this.x - other.x;
		const y = this.y - other.y;
		const z = this.z - other.z;
		return x ** 2 + y ** 2 + z ** 2;
	}

	/**
	 * Performs a component-wise multiplication of this vector and another vector.
	 * @param other The vector to multiply by
	 * @returns `this`
	 */
	multiply(other: Readonly<Vec3>): this {
		this.x *= other.x;
		this.y *= other.y;
		this.z *= other.z;
		return this;
	}

	/**
	 * Calculates the dot product of this vector and another vector.
	 * @param other The vector to calculate the dot product against
	 * @returns The dot product
	 */
	dot(other: Readonly<Vec3>): number {
		return this.x * other.x + this.y * other.y + this.z * other.z;
	}

	/**
	 * Sets this vector to the cross product of this vector and another vector.
	 * @param other The vector to cross
	 * @returns `this`
	 */
	cross(other: Readonly<Vec3>): this {
		const { x, y, z } = this;
		const { x: bx, y: by, z: bz } = other;
		this.x = y * bz - z * by;
		this.y = z * bx - x * bz;
		this.z = x * by - y * bx;
		return this;
	}

	/**
	 * Linearly interpolates from this vector to a target vector.
	 * @param target The target vector
	 * @param t The timestep for interpolation
	 * @returns `this`
	 */
	lerp(target: Readonly<Vec3>, t: number): this {
		const { x, y, z } = this;
		this.x += t * (target.x - x);
		this.y += t * (target.y - y);
		this.z += t * (target.z - z);
		return this;
	}

	/**
	 * Spherical-linearly interpolates from this vector to a target vector.
	 * @param target The target vector
	 * @param t The timestep for interpolation
	 * @returns `this`
	 */
	slerp(target: Readonly<Vec3>, t: number): this {
		const dot = this.dot(target);
		const angle = Math.acos(Math.min(Math.max(dot, -1), 1));
		const sinTotal = Math.sin(angle);

		const ratioA = Math.sin((1 - t) * angle) / sinTotal;
		const ratioB = Math.sin(t * angle) / sinTotal;
		this.x = ratioA * this.x + ratioB * target.x;
		this.y = ratioA * this.y + ratioB * target.y;
		this.z = ratioA * this.z + ratioB * target.z;

		return this;
	}

	/**
	 * Determines if all components of this vector are identical to all components of another vector.
	 * @param other The Vec3 to compare against
	 * @returns A boolean indicating if these vectors are equivalent.
	 */
	equals(other: Readonly<Vec3>): boolean {
		return this.x === other.x && this.y === other.y && this.z === other.z;
	}

	*[Symbol.iterator](): IterableIterator<number> {
		yield this.x;
		yield this.y;
		yield this.z;
	}

	/**
	 * Returns a string representation of this vector.
	 */
	toString(): string {
		return `${this.constructor.name}(${this.x}, ${this.y}, ${this.z})`;
	}
}
