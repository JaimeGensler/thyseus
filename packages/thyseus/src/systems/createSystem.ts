export default {};
// import { Commands } from '../commands';
// import { EventReader, EventWriter } from '../events';
// import { Query } from '../queries';
// import { Res, SystemRes } from '../resources';
// import { Thread } from '../threads';
// import { World } from '../world';
// import { SystemParameter } from './System';

// const defaultSystemParameters = {
// 	query: Query,
// 	res: Res,
// 	systemRes: SystemRes,
// 	eventReader: EventReader,
// 	eventWriter: EventWriter,
// 	thread: Thread,
// 	world: World,
// 	commands: Commands,
// } as const;
// type DefaultSystemParameters = typeof defaultSystemParameters;

// type SecondaryArguments<T> = T extends (world: World, ...rest: infer R) => any
// 	? R
// 	: never;
// type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// type SystemCreator<
// 	P extends any[],
// 	T extends Record<string, SystemParameter>,
// > = {
// 	[Key in keyof T]: (
// 		...args: SecondaryArguments<T[Key]['intoArgument']>
// 	) => SystemCreator<[...P, ReturnType<T[Key]['intoArgument']>], T>;
// } & { build<Z extends (...args: P) => void>(system: Z): Z };
// export function createSystem<T extends Record<string, SystemParameter>>(
// 	arg?: T,
// ): SystemCreator<[], T & DefaultSystemParameters> {
// 	const args = [];
// 	const builder = {} as SystemCreator<[], T & DefaultSystemParameters>;
// 	for (const key in { ...defaultSystemParameters, ...arg }) {
// 		builder[key as keyof typeof builder] = (...args: any[]) => {};
// 	}
// 	builder.build = (fn: any) => {
// 		fn.getSystemArguments = (world: World) => [];
// 		return fn;
// 	};
// 	return builder;
// }

// const mySystem = createSystem()
// 	.world()
// 	.commands()
// 	.build((world, cmds) => cmds);
