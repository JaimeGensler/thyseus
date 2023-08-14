import { Entity, type Query } from 'thyseus';

function mySystem(query: Query<[Position, Velocity]>, _: any) {
	for (const [pos, vel] of query) {
		pos.add(vel);
	}
}
function myOtherSystem(query: Query<Entity>, _: any) {
	for (const entity of query) {
		console.log(entity.id);
	}
}
