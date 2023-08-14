import { struct } from 'thyseus';

@struct
class Parent {
	inner: Child;
}

@struct
class Child {
	isInner: boolean;
}
