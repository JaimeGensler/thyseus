import type { SendableClass, SendableType } from '../utils/Threads';

export interface Class {
	new (...args: any[]): object;
}
export type ResourceType = SendableClass<SendableType> | Class;
export function Resource(...args: any[]): any {}
