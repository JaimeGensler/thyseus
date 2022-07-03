import type { ShareableType } from '../utils/Thread';
import type SystemRelationship from './SystemRelationship';

export type DescriptorToArgument<T extends Descriptor> = T['__T'];
export interface Descriptor {
	type: unknown;
	data: unknown;
	__T: unknown;
}

export default interface Parameter<
	T extends Descriptor = Descriptor,
	S extends ShareableType = ShareableType,
> {
	// Utility methods
	recognizesDescriptor(descriptor: T): boolean;
	isLocalToThread(descriptor: T): boolean;
	getRelationship(left: T, right: T): SystemRelationship;

	// Lifecycle methods
	onAddSystem?(descriptor: T): void;

	onBuildMainWorld?(parameters: Parameter[]): void;
	onBuildThreadWorld?(...args: unknown[]): unknown;

	onBuildSystem(descriptor: T): DescriptorToArgument<T>;

	sendToThread?(): S;
	receiveOnThread?(data: S): void;
}
