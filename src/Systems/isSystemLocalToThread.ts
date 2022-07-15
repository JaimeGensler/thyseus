import type { SystemDefinition } from './defineSystem';
import type { Parameter, Descriptor } from './Parameters';

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
