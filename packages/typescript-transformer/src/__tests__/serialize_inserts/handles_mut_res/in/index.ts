import { Mut, Res, SystemRes, World, struct } from 'thyseus';
import { FixedTime, State } from './others';

export async function fixedLoopSystem(
	world: World,
	fixedTime: Res<Mut<FixedTime>>,
	state: SystemRes<State>,
) {}
