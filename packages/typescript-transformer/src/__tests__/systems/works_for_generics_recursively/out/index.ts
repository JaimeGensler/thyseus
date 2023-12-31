import { Query } from 'thyseus';
class A {}
function querySystem(query: Query<Query<A>>) {}
querySystem.getSystemArguments = (__w: any) => [
	Query.intoArgument(__w, Query.intoArgument(__w, A)),
];
