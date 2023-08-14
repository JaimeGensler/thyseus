import { Entity, type Query } from 'thyseus';
function mySystem(query: Query<[Position, Velocity]>, _: any) {
	for (const [pos, vel] of query) {
		pos.deserialize();
		vel.deserialize();
		pos.add(vel);
		pos.serialize();
		vel.serialize();
	}
}
function myOtherSystem(query: Query<Entity>, _: any) {
	for (const entity of query) {
		entity.deserialize();
		console.log(entity.id);
		entity.serialize();
	}
}
