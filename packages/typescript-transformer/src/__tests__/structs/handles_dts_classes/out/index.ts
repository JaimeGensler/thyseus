import { Point } from './type';
import { struct } from 'thyseus';
class Location {
	static readonly size = 24;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.point.__$$b = this.__$$b;
		this.point.deserialize();
	}
	serialize() {
		this.point.__$$b = this.__$$b;
		this.point.serialize();
	}
	point: Point = new Point();
}
