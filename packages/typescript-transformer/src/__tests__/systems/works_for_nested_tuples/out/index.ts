import { Query, With } from 'thyseus';
class A {}
class B {}
class C {}
class D {}
function querySystem(query: Query<[A, B], With<C, D>>) {}
querySystem.getSystemArguments = (__w: any) => [
	Query.intoArgument(__w, [A, B], With.intoArgument(__w, C, D)),
];
