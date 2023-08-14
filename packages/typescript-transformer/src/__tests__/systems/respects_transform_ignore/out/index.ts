import { CommandsDescriptor } from 'thyseus';
// thyseus-ignore
function mySystem(systemRes: SystemRes<Map<bigint, bigint>>) { }
function otherSystem(commands: Commands) { }
otherSystem.parameters = [new CommandsDescriptor()];
