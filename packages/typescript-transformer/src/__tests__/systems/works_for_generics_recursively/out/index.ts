import { QueryDescriptor, ReadModifier } from 'thyseus';
function querySystem(query: Query<Readonly<A>>) {}
querySystem.parameters = [new QueryDescriptor(new ReadModifier(A))];
