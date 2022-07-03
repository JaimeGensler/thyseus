import type { SendableClass, SendableType } from '../utils/Thread';
import type SystemRelationship from './SystemRelationship';

export type DescriptorToArgument<T extends Descriptor> = T['__T'];
export interface Descriptor {
	type: unknown;
	data: unknown;
	__T: unknown;
}

export default interface Parameter<T extends Descriptor = Descriptor> {
	get type(): symbol;

	// Utility methods
	isLocalToThread(descriptor: T): boolean;
	getRelationship(left: T, right: T): SystemRelationship;
	extendSendable?(): SendableClass[];

	// Lifecycle methods
	onAddSystem?(descriptor: T): void;

	onBuildMainWorld?(parameters: Parameter[]): void;
	onBuildThreadWorld?(...args: unknown[]): unknown;

	onBuildSystem(descriptor: T): DescriptorToArgument<T>;

	sendToThread?(): SendableType;
	receiveOnThread?(data: SendableType): void;
}
