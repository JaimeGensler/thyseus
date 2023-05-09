export { applyCommands } from './commands';
export { World } from './world';
export { Entity, initStruct, dropStruct } from './storage';
export { struct } from './struct';
export { run, CoreSchedule } from './schedule';
export { memory } from './utils/memory';
export { cloneSystem } from './systems';

export {
	CommandsDescriptor,
	QueryDescriptor,
	ResourceDescriptor,
	SystemResourceDescriptor,
	WorldDescriptor,
	EventReaderDescriptor,
	EventWriterDescriptor,
	MutDescriptor,
	WithDescriptor,
	WithoutDescriptor,
	// Optional,
	OrDescriptor,
} from './descriptors';

export type { Commands, EntityCommands } from './commands';
export type { EventReader, EventWriter } from './events';
export type { Query, Mut, Optional, With, Without, Or } from './queries';
export type { Res, SystemRes } from './resources';
export type { ExecutorType, ExecutorInstance, SystemConfig } from './schedule';
export type { Table, Entities } from './storage';
export type { Struct } from './struct';
export type { System, SystemParameter } from './systems';
export type { ThreadGroup } from './threads';
export type { Memory } from './utils/memory';
export type { WorldBuilder, Plugin, WorldConfig } from './world';
