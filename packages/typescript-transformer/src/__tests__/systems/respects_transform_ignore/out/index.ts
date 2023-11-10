import { SystemRes, Commands } from 'thyseus';
// thyseus-ignore
function mySystem(systemRes: SystemRes<Map<bigint, bigint>>) {}
function otherSystem(commands: Commands) {}
otherSystem.getSystemArguments = (__w: any) => [Commands.intoArgument(__w)];
