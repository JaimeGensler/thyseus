import { struct, type u8, type i32 } from 'thyseus';

@struct
class PrivateData {
	notPrivate: u8;
	#private: number;
	#otherPrivateData: [i32, i32];
}
