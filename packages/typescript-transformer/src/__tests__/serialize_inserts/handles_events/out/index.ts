import type { EventReader, EventWriter } from 'thyseus';
function reader(events: EventReader<LevelUpEvent>, _: any) {
	for (const event of events) {
		event.deserialize();
		console.log(event);
		event.serialize();
	}
}
function writer(events: EventWriter<LevelUpEvent>, _: any) {
	for (const event of events) {
		event.deserialize();
		console.log(event);
		event.serialize();
	}
}
