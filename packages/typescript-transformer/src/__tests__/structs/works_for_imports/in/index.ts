import { struct } from 'thyseus';
import { Vec3 } from './Vec3';

@struct
class ContainsVec {
	v3: Vec3 = new Vec3();
	bool: boolean = false;
}
