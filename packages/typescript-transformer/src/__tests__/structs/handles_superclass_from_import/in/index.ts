import { struct } from 'thyseus';
import { Bird } from './Bird';

@struct
export class Penguin extends Bird {
	otherProperty: boolean = true;
}
