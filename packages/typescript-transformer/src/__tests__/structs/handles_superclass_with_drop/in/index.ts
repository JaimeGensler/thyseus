import { struct } from 'thyseus';

@struct
class Parent {
	prop: string = '';
}

@struct
class Child extends Parent {
	double: number = 0;
}
