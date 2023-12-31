import { Query } from 'thyseus';
class A {}
function querySystem(query: Query<Query<A>>) {}
