import { EventReader, EventWriter } from 'thyseus';
class LevelUpEvent {}
const arrowSystem = (
	eventReader: EventReader<LevelUpEvent>,
	eventWriter: EventWriter<LevelUpEvent>,
) => {};
arrowSystem.getSystemArguments = (__w: any) => [
	EventReader.intoArgument(__w, LevelUpEvent),
	EventWriter.intoArgument(__w, LevelUpEvent),
];
