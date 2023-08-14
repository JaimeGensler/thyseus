import {
	Res,
	SystemRes,
	World,
	struct,
	WorldDescriptor,
	ResourceDescriptor,
	Mut,
	SystemResourceDescriptor,
} from 'thyseus';
import { FixedTime, State } from './others';
export async function fixedLoopSystem(
	world: World,
	fixedTime: Res<Mut<FixedTime>>,
	state: SystemRes<State>,
) {
	fixedTime.deserialize();
	state.deserialize();
	fixedTime.serialize();
	state.serialize();
}
fixedLoopSystem.parameters = [
	new WorldDescriptor(),
	new ResourceDescriptor(new Mut(FixedTime)),
	new SystemResourceDescriptor(State),
];
