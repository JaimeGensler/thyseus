import { struct, type u32 } from 'thyseus';

@struct
export class Bird {
	climate: u32 = 0;
	canFly: boolean = true;
}
