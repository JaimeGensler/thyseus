import { EventReaderDescriptor, EventWriterDescriptor } from 'thyseus';
const arrowSystem = (eventReader: EventReader<LevelUpEvent>, eventWriter: EventWriter<LevelUpEvent>) => { };
arrowSystem.parameters = [new EventReaderDescriptor(LevelUpEvent), new EventWriterDescriptor(LevelUpEvent)];
