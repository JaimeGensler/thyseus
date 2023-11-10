import { World } from 'thyseus';
const realName = function inaccessibleName(world: World) {};
realName.getSystemArguments = (__w: any) => [World.intoArgument(__w)];
