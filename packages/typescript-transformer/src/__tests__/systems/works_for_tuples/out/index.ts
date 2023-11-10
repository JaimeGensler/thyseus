import { Query } from 'thyseus';
class A {}
class B {}
function querySystem(query: Query<[A, B]>) {}
querySystem.getSystemArguments = (__w: any) => [
	Query.intoArgument(__w, [A, B]),
];
