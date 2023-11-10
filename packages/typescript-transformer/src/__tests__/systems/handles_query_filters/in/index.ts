import { Query, And, With, Without, Entity } from 'thyseus';
class A {}
class B {}
function temp(query: Query<Entity, And<With<A>, Without<B>>>) {}
