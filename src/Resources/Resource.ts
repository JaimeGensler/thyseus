import { ComponentType } from '../Components';

export interface Class {
	new (...args: any[]): object;
}
export type ResourceType = ComponentType | Class;
