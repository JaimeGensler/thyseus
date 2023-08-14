import { struct } from 'thyseus';

@struct
abstract class Abstract {
	abstract field: number;
}
@struct
class Concrete {
	declare declaredProp: number;
	static staticProp: number;
	readonly prop: number;
}
