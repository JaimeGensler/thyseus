import { SystemRes } from 'thyseus';
function mySystem(systemRes: SystemRes<Map<bigint, bigint>>) {}
mySystem.getSystemArguments = (__w: any) => [SystemRes.intoArgument(__w, Map)];
