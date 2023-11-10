import { Commands, SystemRes, EventReader, EventWriter } from 'thyseus';
class LevelUp {}
class LevelDown {}
export function mySystem(
	commands: Commands,
	map: SystemRes<Map<bigint, bigint>>,
	reader: EventReader<LevelUp>,
	writer: EventWriter<LevelDown>,
) {}
