import type * as Thyseus from '.';
import type { Accessors, Filter, OrContent } from './queries';

declare global {
	type Entity = Thyseus.Entity;
	type EntityCommands = Thyseus.EntityCommands;
	type Table = Thyseus.Table;
	type Entities = Thyseus.Entities;
	type ExecutorType = Thyseus.ExecutorType;
	type ExecutorInstance = Thyseus.ExecutorInstance;
	type Struct = Thyseus.Struct;
	type System = Thyseus.System;
	type SystemParameter = Thyseus.SystemParameter;
	type ThreadGroup = Thyseus.ThreadGroup;
	type Memory = Thyseus.Memory;
	type WorldBuilder = Thyseus.WorldBuilder;
	type ThyseusPlugin = Thyseus.Plugin;
	type WorldConfig = Thyseus.WorldConfig;

	// System Parameters
	type Commands = Thyseus.Commands;
	type EventReader<T extends object> = Thyseus.EventReader<T>;
	type EventWriter<T extends object> = Thyseus.EventWriter<T>;
	type Query<A extends Accessors, F extends Filter = []> = Thyseus.Query<
		A,
		F
	>;
	type Res<T extends object> = Thyseus.Res<T>;
	type SystemRes<T extends object> = Thyseus.SystemRes<T>;
	type World = Thyseus.World;

	// Modifiers
	type Mut<T extends object> = Thyseus.Mut<T>;
	type Optional<T extends object> = Thyseus.Optional<T>;
	type With<T extends object | object[]> = Thyseus.With<T>;
	type Without<T extends object | object[]> = Thyseus.Without<T>;
	type Or<L extends OrContent, R extends OrContent> = Thyseus.Or<L, R>;
}
