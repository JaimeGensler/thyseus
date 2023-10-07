import { struct } from 'thyseus';

@struct
class Parent {
	inner: Child = new Child();
}

@struct
class Child {
	isInner: boolean = true;
}
