import { struct, Memory } from 'thyseus';
import { Bird } from './Bird';
class Penguin extends Bird {
	static readonly size = 12;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		super.deserialize();
		this.otherProperty = Boolean(Memory.u8[this.__$$b + 8]);
	}
	serialize() {
		super.serialize();
		Memory.u8[this.__$$b + 8] = Number(this.otherProperty);
	}
	otherProperty: boolean = true;
}
