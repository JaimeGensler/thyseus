import { QueryDescriptor, And, With, Without } from 'thyseus';
function temp(query: Query<Entity, And<With<A>, Without<B>>>) {}
temp.parameters = [
	new QueryDescriptor(Entity, new And(new With(A), new Without(B))),
];
