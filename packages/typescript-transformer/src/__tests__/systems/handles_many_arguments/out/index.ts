import { Commands, SystemRes, EventReader, EventWriter } from 'thyseus';
class LevelUp {}
class LevelDown {}
export function mySystem(
	commands: Commands,
	map: SystemRes<Map<bigint, bigint>>,
	reader: EventReader<LevelUp>,
	writer: EventWriter<LevelDown>,
) {}
mySystem.getSystemArguments = (__w: any) => [
	Commands.intoArgument(__w),
	SystemRes.intoArgument(__w, Map),
	EventReader.intoArgument(__w, LevelUp),
	EventWriter.intoArgument(__w, LevelDown),
];
