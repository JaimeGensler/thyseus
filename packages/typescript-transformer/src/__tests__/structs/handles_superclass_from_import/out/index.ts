import { struct, type Store } from 'thyseus';
import { Bird } from './Bird';
export class Penguin extends Bird {
	static readonly size = 12;
	static readonly alignment = 4;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		super.deserialize(store);
		this.otherProperty = Boolean(store.readU8());
	}
	serialize(store: Store) {
		super.serialize(store);
		store.writeU8(Number(this.otherProperty));
	}
	otherProperty: boolean = true;
}
