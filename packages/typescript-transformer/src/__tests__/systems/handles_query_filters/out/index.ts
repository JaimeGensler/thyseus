import { Query, And, With, Without, Entity } from 'thyseus';
class A {}
class B {}
function temp(query: Query<Entity, And<With<A>, Without<B>>>) {}
temp.getSystemArguments = (__w: any) => [
	Query.intoArgument(
		__w,
		Entity,
		And.intoArgument(
			__w,
			With.intoArgument(__w, A),
			Without.intoArgument(__w, B),
		),
	),
];
