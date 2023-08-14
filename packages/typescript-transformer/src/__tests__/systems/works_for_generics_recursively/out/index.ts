import { QueryDescriptor, Mut } from 'thyseus';
function querySystem(query: Query<Mut<A>>) { }
querySystem.parameters = [new QueryDescriptor(new Mut(A))];
