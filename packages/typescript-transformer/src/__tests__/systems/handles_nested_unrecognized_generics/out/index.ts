import { SystemResourceDescriptor } from 'thyseus';
function mySystem(systemRes: SystemRes<Map<bigint, bigint>>) { }
mySystem.parameters = [new SystemResourceDescriptor(Map)];
