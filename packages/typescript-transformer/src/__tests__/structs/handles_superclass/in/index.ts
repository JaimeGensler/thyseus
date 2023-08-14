import { struct } from 'thyseus';

@struct
class Vec2 {
	x: number = 0;
	y: number = 0;
}

@struct
class Vec3 extends Vec2 {
	z: number = 0;
}
