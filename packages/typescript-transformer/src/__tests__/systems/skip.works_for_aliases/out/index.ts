import * as Thyseus from 'thyseus';
import { WorldDescriptor } from 'thyseus/descriptors';
function mySystem(world: Thyseus.World) { }
mySystem.parameters = [WorldDescriptor()];
