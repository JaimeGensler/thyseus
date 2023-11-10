import { Commands } from 'thyseus';
export function commandsSystem(commands: Commands) {}
commandsSystem.getSystemArguments = (__w: any) => [Commands.intoArgument(__w)];
