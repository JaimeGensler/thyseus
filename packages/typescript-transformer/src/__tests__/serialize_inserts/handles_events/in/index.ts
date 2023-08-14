import type { EventReader, EventWriter } from 'thyseus';

function reader(events: EventReader<LevelUpEvent>, _: any) {
	for (const event of events) {
		console.log(event);
	}
}
function writer(events: EventWriter<LevelUpEvent>, _: any) {
	for (const event of events) {
		console.log(event);
	}
}
