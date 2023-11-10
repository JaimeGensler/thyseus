import { SystemRes } from 'thyseus';
class MyClass {}
export function localResourceSystem(myClass: SystemRes<MyClass>) {}
localResourceSystem.getSystemArguments = (__w: any) => [
	SystemRes.intoArgument(__w, MyClass),
];
