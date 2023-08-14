import { struct } from 'thyseus';
import { Bird } from './Bird';

@struct
class Penguin extends Bird {
	otherProperty: boolean = true;
}
