import { Point } from './type';
import { struct, type Store } from 'thyseus';
class Location {
	static readonly size = 24;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.point.deserialize(store);
	}
	serialize(store: Store) {
		this.point.serialize(store);
	}
	point: Point = new Point();
}
