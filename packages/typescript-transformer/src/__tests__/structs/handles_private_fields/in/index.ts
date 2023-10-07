import { struct, type u8, type i32 } from 'thyseus';

@struct
class PrivateData {
	notPrivate: u8 = 0;
	#private: number = 0;
	#otherPrivateData: [i32, i32] = [0, 0];
}
