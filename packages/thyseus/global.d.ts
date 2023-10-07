import type * as Thyseus from './src';

// NOTE: When developing locally, you must comment out these global types!
// We do not rely on global injection in the core library.
declare global {
	type Entity = Thyseus.Entity;
	type EntityCommands = Thyseus.EntityCommands;
	type Table = Thyseus.Table;
	type Entities = Thyseus.Entities;
	type Struct = Thyseus.Struct;
	type System = Thyseus.System;
	type SystemParameter = Thyseus.SystemParameter;
	type WorldBuilder = Thyseus.WorldBuilder;
	type ThyseusPlugin = Thyseus.Plugin;
	type WorldConfig = Thyseus.WorldConfig;

	// System Parameters
	type Commands = Thyseus.Commands;
	type EventReader<T extends object> = Thyseus.EventReader<T>;
	type EventWriter<T extends object> = Thyseus.EventWriter<T>;
	type Query<
		A extends object | object[],
		F extends Thyseus.Filter = Thyseus.Filter,
	> = Thyseus.Query<A, F>;
	type Res<T extends object> = Thyseus.Res<T>;
	type SystemRes<T extends object> = Thyseus.SystemRes<T>;
	type World = Thyseus.World;

	// Modifiers
	type Read<T extends object> = Thyseus.Read<T>;

	// Filters
	type Filter = Thyseus.Filter;
	type With<
		A extends object,
		B extends object = object,
		C extends object = object,
		D extends object = object,
	> = Thyseus.With<A, B, C, D>;
	type Without<
		A extends object,
		B extends object = object,
		C extends object = object,
		D extends object = object,
	> = Thyseus.Without<A, B, C, D>;
	type Or<
		A extends Filter,
		B extends Filter,
		C extends Filter = Filter,
		D extends Filter = Filter,
	> = Thyseus.Or<A, B, C, D>;
	type And<
		A extends Filter,
		B extends Filter,
		C extends Filter = Filter,
		D extends Filter = Filter,
	> = Thyseus.And<A, B, C, D>;

	type u8 = Thyseus.u8;
	type u16 = Thyseus.u16;
	type u32 = Thyseus.u32;
	type u64 = Thyseus.u64;
	type i8 = Thyseus.i8;
	type i16 = Thyseus.i16;
	type i32 = Thyseus.i32;
	type i64 = Thyseus.i64;
	type f32 = Thyseus.f32;
	type f64 = Thyseus.f64;
}
