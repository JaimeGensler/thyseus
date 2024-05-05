import { Vec4 } from './Vec4';

export class Quat extends Vec4 {
	clone(): Quat {
		return new Quat(this.x, this.y, this.z, this.w);
	}

	identity(): this {
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.w = 1;
		return this;
	}

	conjugate() {
		this.x *= -1;
		this.y *= -1;
		this.z *= -1;
		return this;
	}
}
