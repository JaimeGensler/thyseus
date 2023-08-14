import { CommandsDescriptor, SystemResourceDescriptor, EventReaderDescriptor, EventWriterDescriptor } from 'thyseus';
export function mySystem(commands: Commands, map: SystemRes<Map<bigint, bigint>>, reader: EventReader<LevelUp>, writer: EventWriter<LevelDown>) { }
mySystem.parameters = [new CommandsDescriptor(), new SystemResourceDescriptor(Map), new EventReaderDescriptor(LevelUp), new EventWriterDescriptor(LevelDown)];
