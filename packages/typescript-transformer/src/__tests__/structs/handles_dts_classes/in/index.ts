import { Point } from './type';
import { struct } from 'thyseus';

@struct
class Location {
	point: Point = new Point();
}
