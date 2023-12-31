import { Query } from 'thyseus';
class A {}
function querySystem(query: Query<Readonly<A>>) {}
querySystem.getSystemArguments = (__w: any) => [Query.intoArgument(__w, A)];
