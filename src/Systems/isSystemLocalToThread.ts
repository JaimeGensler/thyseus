import type { SystemDefinition } from './defineSystem';
import type { default as Parameter, Descriptor } from './Parameter';

export default function isSystemLocalToThread(
	system: SystemDefinition,
	parameters: Parameter[],
) {
	return system.parameters.some((systemParam: Descriptor) =>
		parameters
			.find(p => p.type === systemParam.type)!
			.isLocalToThread(systemParam),
	);
}
