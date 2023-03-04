type SendableType =
	| void
	| null
	| undefined
	| boolean
	| number
	| string
	| bigint
	| ArrayBuffer
	| SharedArrayBuffer
	| Uint8Array
	| Uint16Array
	| Uint32Array
	| BigUint64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| BigInt64Array
	| Float32Array
	| Float64Array
	| Uint8ClampedArray
	| DataView
	| Date
	| RegExp
	| Blob
	| File
	| FileList
	| ImageBitmap
	| ImageData
	| SendableType[]
	| {
			[key: string]: SendableType;
	  }
	| Map<SendableType, SendableType>
	| Set<SendableType>;
type OnReceive<I extends SendableType[], O extends SendableType> = (
	world: World,
) => (...data: I) => O;
type ThreadMessage<I extends SendableType[], O> = [string, number, I];
type ThreadMessageChannel<
	I extends SendableType[] = [],
	O extends SendableType = void,
> = {
	(...data: I): ThreadMessage<I, O>;
	channelName: string;
	onReceive: OnReceive<I, O>;
};
declare function createThreadChannel<
	I extends SendableType[],
	O extends SendableType,
>(channelName: string, onReceive: OnReceive<I, O>): ThreadMessageChannel<I, O>;

type ThreadMessageEvent = MessageEvent<ThreadMessage<SendableType[], any>> & {
	currentTarget: WorkerOrGlobal;
};
type WorkerOrGlobal = {
	postMessage(content: SendableType): void;
	addEventListener(
		type: 'message',
		fn: (event: ThreadMessageEvent) => void,
	): void;
	removeEventListener(
		type: 'message',
		fn: (event: ThreadMessageEvent) => void,
	): void;
};
declare class ThreadGroup {
	#private;
	static isMainThread: boolean;
	isMainThread: boolean;
	static spawn(count: number, url: string | URL | undefined): ThreadGroup;
	constructor(threads: WorkerOrGlobal[]);
	setListener<I extends SendableType[], O extends SendableType>(
		channelName: string,
		listener: (...args: I) => O,
	): void;
	deleteListener(channelName: string): void;
	/**
	 * Sends a value to a channel.
	 * @param channel The channel to send the value to.
	 * @param message The value to send.
	 * @returns A promise, resolves to an array of results from all threads.
	 */
	send<T>(message: ThreadMessage<any, T>): Promise<T[]>;
	/**
	 * On the main thread, creates a value, pushes it to the queue, and returns the value.
	 *
	 * On Worker threads, removes and returns the next item in the queue.
	 *
	 * **NOTE:** Queue must be manually sent between threads - use with `ThreadGroup.prototoype.wrapInQueue`.
	 * @param create A function to create the value - only called on the main thread.
	 * @returns The value created by `create` function.
	 */
	queue<T extends SendableType>(create: () => T): T;
	wrapInQueue<T = void>(callback: () => T | Promise<T>): Promise<T>;
}

declare function substruct(
	struct: Struct,
): (prototype: object, propertyKey: string | symbol) => void;

declare const TYPE_TO_CONSTRUCTOR: {
	readonly u8: Uint8ArrayConstructor;
	readonly u16: Uint16ArrayConstructor;
	readonly u32: Uint32ArrayConstructor;
	readonly u64: BigUint64ArrayConstructor;
	readonly i8: Int8ArrayConstructor;
	readonly i16: Int16ArrayConstructor;
	readonly i32: Int32ArrayConstructor;
	readonly i64: BigInt64ArrayConstructor;
	readonly f32: Float32ArrayConstructor;
	readonly f64: Float64ArrayConstructor;
};
type PrimitiveName = keyof typeof TYPE_TO_CONSTRUCTOR;

type ArrayOptions = {
	type: PrimitiveName;
	length: number;
};
declare function array({
	type,
	length,
}: ArrayOptions): (prototype: object, propertyKey: string | symbol) => void;

declare function string(prototype: object, propertyKey: string | symbol): void;

type Class = {
	new (...args: any[]): object;
};
type Struct = {
	/**
	 * The alignment of this type - equal to the number of bytes of the largest primitive type this struct contains (1, 2, 4, or 8).
	 */
	alignment?: number;
	/**
	 * The size of this struct, including padding. Always a multiple of alignment.
	 */
	size?: number;
	pointers?: number[];
	new (): object;
};
declare function struct(targetClass: Class): any;
type stringDec = typeof string;
type arrayDec = typeof array;
type substructDec = typeof substruct;
declare namespace struct {
	var bool: (prototype: object, propertyKey: string | symbol) => void;
	var u8: (prototype: object, propertyKey: string | symbol) => void;
	var u16: (prototype: object, propertyKey: string | symbol) => void;
	var u32: (prototype: object, propertyKey: string | symbol) => void;
	var u64: (prototype: object, propertyKey: string | symbol) => void;
	var i8: (prototype: object, propertyKey: string | symbol) => void;
	var i16: (prototype: object, propertyKey: string | symbol) => void;
	var i32: (prototype: object, propertyKey: string | symbol) => void;
	var i64: (prototype: object, propertyKey: string | symbol) => void;
	var f32: (prototype: object, propertyKey: string | symbol) => void;
	var f64: (prototype: object, propertyKey: string | symbol) => void;
	var string: stringDec;
	var array: arrayDec;
	var substruct: substructDec;
}

declare class Table {
	#private;
	static createEmptyTable(world: World): Table;
	static createRecycledTable(world: World): Table;
	static create(
		world: World,
		components: Struct[],
		bitfield: bigint,
		id: number,
	): Table;
	bitfield: bigint;
	constructor(
		world: World,
		sizedComponents: Struct[],
		pointer: number,
		bitfield: bigint,
		id: number,
	);
	get pointer(): number;
	get id(): number;
	get capacity(): number;
	get size(): number;
	set size(value: number);
	getColumn(componentType: Struct): number;
	hasColumn(componentType: Struct): boolean;
	delete(index: number): void;
	move(index: number, targetTable: Table): bigint;
	grow(): void;
	copyComponentIntoRow(
		row: number,
		componentType: Struct,
		copyFrom: number,
	): void;
}

declare class EntityCommands extends BaseEntity {
	#private;
	constructor(commands: Commands, id: bigint);
	get id(): bigint;
}

type NotFunction$1<T> = T extends Function ? never : T;
type Command = {
	type: number;
	dataStart: number;
	dataSize: number;
};
declare class Commands {
	#private;
	static fromWorld(world: World): Commands;
	constructor(world: World, initialValuePointers: number[], pointer: number);
	/**
	 * Queues an entity to be spawned.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(): EntityCommands;
	/**
	 * Queues an entity to be despawned.
	 * @param id The id of the entity to despawn.
	 * @returns `this`, for chaining.
	 */
	despawn(id: bigint): void;
	/**
	 * Gets `EntityCommands` for an Entity.
	 * @param id The id of the entity to get.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	getEntityById(id: bigint): EntityCommands;
	insertInto<T extends object>(
		entityId: bigint,
		component: NotFunction$1<T>,
	): void;
	insertTypeInto(entityId: bigint, componentType: Struct): void;
	removeFrom(entityId: bigint, componentType: Struct): void;
	[Symbol.iterator](): Generator<Command, void, unknown>;
	pushCommand(size: number, type: number): number;
	reset(): void;
}

declare class CommandsDescriptor implements Descriptor {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	intoArgument(world: World): Commands;
	onAddSystem(builder: WorldBuilder): void;
}

declare const applyCommands: SystemDefinition<[World, Map<bigint, bigint>]>;

type NotFunction<T> = T extends Function ? never : T;
/**
 * A base class to share methods between `Entity`, `EntityCommands`, and `EntityBatchCommands`.
 */
declare class BaseEntity {
	#private;
	constructor(commands: Commands);
	get id(): bigint;
	/**
	 * Queues a component to be inserted into this entity.
	 * @param component The component instance to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	add<T extends object>(component: NotFunction<T>): this;
	/**
	 * Queues a component type to be inserted into this entity.
	 * @param componentType The component class to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	addType(componentType: Struct): this;
	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(Component: Struct): this;
	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void;
}

declare class Entity extends BaseEntity {
	static size: number;
	static alignment: number;
	private __$$b;
	constructor(commands?: Commands);
	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint;
	/**
	 * The index of this entity (uint32).
	 */
	get index(): number;
	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number;
}

declare class Entities {
	#private;
	static fromWorld(world: World): Entities;
	constructor(world: World, pointer: number);
	/**
	 * A lockfree method to obtain a new Entity ID
	 */
	spawn(): bigint;
	/**
	 * Checks if an entity is currently alive or not.
	 * @param entityId The entity id to check
	 * @returns `true` if alive, `false` if not.
	 */
	isAlive(entityId: bigint): boolean;
	resetCursor(): void;
	getTableIndex(entityId: bigint): number;
	setTableIndex(entityId: bigint, tableIndex: number): void;
	getRow(entityId: bigint): number;
	setRow(entityId: bigint, row: number): void;
	getBitset(entityId: bigint): bigint;
}

declare function initStruct(instance: object): void;
declare function dropStruct(instance: object): void;

declare class Optional<T extends object | Mut<object>> {
	#private;
	constructor(
		value:
			| T
			| {
					new (...args: any): T;
			  },
	);
	get value(): Struct | Mut<any>;
}
declare class Mut<T extends object> {
	#private;
	constructor(value: { new (...args: any): T });
	get value(): Struct;
}
declare class With<T extends object | object[]> {
	#private;
	constructor(
		value:
			| {
					new (...args: any): T;
			  }
			| {
					new (...args: any): T;
			  }[],
	);
	get value(): Struct | Struct[];
}
declare class Without<T extends object | object[]> {
	#private;
	constructor(
		value:
			| {
					new (...args: any): T;
			  }
			| {
					new (...args: any): T;
			  }[],
	);
	get value(): Struct | Struct[];
}
type OrContent =
	| With<object>
	| Without<object>
	| Or<OrContent, OrContent>
	| OrContent[];
declare class Or<L extends OrContent, R extends OrContent> {
	#private;
	constructor(l: L, r: R);
	get l(): OrContent;
	get r(): OrContent;
}
type Filter = With<any> | Without<any> | Or<any, any> | Filter[];

type Accessors = object | object[];
type QueryIteration<A extends Accessors> = A extends any[]
	? {
			[Index in keyof A]: IteratorItem<A[Index]>;
	  }
	: IteratorItem<A>;
type IteratorItem<I> = I extends Optional<infer X>
	? X extends Mut<infer Y>
		? Y | null
		: Readonly<X> | null
	: I extends Mut<infer X>
	? X
	: Readonly<I>;
declare class Query<A extends Accessors, F extends Filter = []> {
	#private;
	constructor(
		withFilters: bigint[],
		withoutFilters: bigint[],
		isIndividual: boolean,
		components: Struct[],
		world: World,
	);
	/**
	 * The number of entities that match this query.
	 */
	get length(): number;
	[Symbol.iterator](): Iterator<QueryIteration<A>>;
	forEach(
		callback: (
			...components: A extends any[]
				? QueryIteration<A>
				: [QueryIteration<A>]
		) => void,
	): void;
	testAdd(tableId: bigint, table: Table): void;
}

type AccessDescriptor =
	| Struct
	| Mut<object>
	| Optional<object>
	| Optional<Mut<object>>;
type UnwrapElement<E extends any> = E extends Class ? InstanceType<E> : E;
declare class QueryDescriptor<
	A extends AccessDescriptor | AccessDescriptor[],
	F extends Filter = [],
> implements Descriptor
{
	components: Struct[];
	writes: boolean[];
	optionals: boolean[];
	filters: F;
	isIndividual: boolean;
	constructor(accessors: A | [...(A extends any[] ? A : never)], filters?: F);
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(builder: WorldBuilder): void;
	intoArgument(world: World): Query<
		A extends any[]
			? {
					[Index in keyof A]: UnwrapElement<A[Index]>;
			  }
			: UnwrapElement<A>,
		F
	>;
}

declare class ResourceDescriptor<T extends Class | Mut<Class>>
	implements Descriptor
{
	resource: Class;
	canWrite: boolean;
	constructor(resource: T);
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(builder: WorldBuilder): void;
	intoArgument(
		world: World,
	): T extends Mut<infer X>
		? X
		: Readonly<InstanceType<T extends Class ? T : never>>;
}

declare class SystemResourceDescriptor<T extends object> implements Descriptor {
	resourceType: Class;
	constructor(resource: { new (): T });
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(builder: WorldBuilder): void;
	intoArgument({ threads }: World): Promise<T>;
}

declare class EventReader<T extends object> {
	#private;
	constructor(
		commands: Commands,
		struct: Struct & {
			new (): T;
		},
		pointer: number,
		instance?: T,
	);
	/**
	 * The event type (struct) for this queue.
	 */
	get type(): Struct;
	/**
	 * The number of events currently in this queue.
	 */
	get length(): number;
	[Symbol.iterator](): this extends EventWriter<any>
		? Iterator<T>
		: Iterator<Readonly<T>>;
	/**
	 * Sets this event queue to be cleared when commands are next processed.
	 */
	clear(): void;
}
declare class EventWriter<T extends object> extends EventReader<T> {
	#private;
	constructor(
		commands: Commands,
		struct: Struct & {
			new (): T;
		},
		pointer: number,
	);
	/**
	 * Creates a new event and returns a mutable instance of that event.
	 * Returned instance will be reused.
	 *
	 * @returns A mutable instance of the event.
	 */
	create(): T;
	/**
	 * Creates an event on the queue from a passed instance of a struct.
	 * @param instance The event to add to the event queue.
	 */
	createFrom(instance: T): void;
	/**
	 * Creates an event with the default data for that event.
	 */
	createDefault(): void;
	/**
	 * **Immediately** clears all events in this queue.
	 */
	clearImmediate(): void;
}

declare class EventReaderDescriptor<T extends Struct> implements Descriptor {
	eventType: Struct;
	constructor(eventType: T);
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(builder: WorldBuilder): void;
	intoArgument(world: World): EventReader<InstanceType<T>>;
}
declare class EventWriterDescriptor<T extends Struct> implements Descriptor {
	eventType: Struct;
	constructor(eventType: T);
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(builder: WorldBuilder): void;
	intoArgument(world: World): EventWriter<InstanceType<T>>;
}

declare class WorldDescriptor implements Descriptor {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	intoArgument(world: World): World;
	onAddSystem(builder: WorldBuilder): void;
}

type Descriptor = {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(worldBuilder: WorldBuilder): void;
	intoArgument(world: World): any;
};

declare const descriptors: {
	readonly Commands: () => CommandsDescriptor;
	readonly Query: <
		A extends AccessDescriptor | AccessDescriptor[],
		F extends Filter = [],
	>(
		accessors: A | [...(A extends any[] ? A : never)],
		filters?: F | undefined,
	) => QueryDescriptor<A, F>;
	readonly Res: <T extends Class | Mut<Class>>(
		resource: T,
	) => ResourceDescriptor<T>;
	readonly World: () => WorldDescriptor;
	readonly SystemRes: <T_1 extends object>(
		resource: new () => T_1,
	) => SystemResourceDescriptor<T_1>;
	readonly Mut: <T_2 extends object>(
		value: new (...args: any) => T_2,
	) => Mut<T_2>;
	readonly Optional: <T_3 extends object | Mut<object>>(
		value: T_3 | (new (...args: any) => T_3),
	) => Optional<T_3>;
	readonly With: <T_4 extends object | object[]>(
		value: (new (...args: any) => T_4) | (new (...args: any) => T_4)[],
	) => With<T_4>;
	readonly Without: <T_5 extends object | object[]>(
		value: (new (...args: any) => T_5) | (new (...args: any) => T_5)[],
	) => Without<T_5>;
	readonly EventReader: <T_6 extends Struct>(
		eventType: T_6,
	) => EventReaderDescriptor<T_6>;
	readonly EventWriter: <T_7 extends Struct>(
		eventType: T_7,
	) => EventWriterDescriptor<T_7>;
	readonly Or: <L extends OrContent, R extends OrContent>(
		l: OrContent,
		r: OrContent,
	) => Or<L, R>;
};
type Descriptors = typeof descriptors;

type SystemFunction<T extends any[]> = (...args: T) => any;
type ParameterCreator = (descriptors: Descriptors) => Descriptor[];
type SystemDependencies = {
	dependencies: SystemDefinition[];
	implicitPosition: -1 | 0 | 1;
};
declare class SystemDefinition<T extends any[] = any[]> {
	#private;
	fn: SystemFunction<T>;
	constructor(parameters: ParameterCreator, fn: SystemFunction<T>);
	get parameters(): Descriptor[];
	before(...others: SystemDefinition<any>[]): this;
	after(...others: SystemDefinition<any>[]): this;
	beforeAll(): this;
	afterAll(): this;
	clone(): SystemDefinition<T>;
	getAndClearDependencies(): SystemDependencies;
}

type UnwrapPromise<T extends any> = T extends Promise<infer X> ? X : T;
declare function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: SystemFunction<{
		[Index in keyof T]: UnwrapPromise<ReturnType<T[Index]['intoArgument']>>;
	}>,
): SystemDefinition<{
	[Index in keyof T]: UnwrapPromise<ReturnType<T[Index]['intoArgument']>>;
}>;

type ExecutorInstance = {
	start(): Promise<void>;
};
type ExecutorType = {
	fromWorld(
		world: World,
		systemDefinitions: SystemDefinition[],
		systemDependencies: SystemDependencies[],
	): ExecutorInstance;
};

type WorldConfig = {
	threads: number;
	getNewTableSize(prev: number): number;
	memory: number;
};
type SingleThreadedWorldConfig = WorldConfig & {
	threads: 1;
};

type Plugin = (worldBuilder: WorldBuilder) => void;
declare function definePlugin<T extends Plugin>(plugin: T): T;

declare class WorldBuilder {
	#private;
	systems: SystemDefinition[];
	components: Set<Struct>;
	resources: Set<Class>;
	events: Set<Struct>;
	threadChannels: ThreadMessageChannel[];
	executor: ExecutorType;
	config: Readonly<WorldConfig>;
	url: Readonly<string | URL | undefined>;
	constructor(config: WorldConfig, url: string | URL | undefined);
	/**
	 * Adds a system to the world and processes its parameter descriptors.
	 * @param system The system to add.
	 * @param dependencies The dependencies of this system.
	 * @returns `this`, for chaining.
	 */
	addSystem(system: SystemDefinition): this;
	/**
	 * Adds a system to the world _**that will only be run once when built**_.
	 * @param system The system to add.
	 * @returns `this`, for chaining.
	 */
	addStartupSystem(system: SystemDefinition): this;
	/**
	 * Passes this WorldBuilder to the provided plugin function.
	 * @param plugin The plugin to pass this WorldBuilder to.
	 * @returns `this`, for chaining.
	 */
	addPlugin(plugin: Plugin): this;
	/**
	 * Registers a Component in the world. Called automatically for all queried components when a system is added.
	 * @param componentType The componentType (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(componentType: Struct): this;
	/**
	 * Registers a Resource in the world. Called automatically for all accessed resources when a system is added.
	 * @param resourceType The Resource type (`Class`) to register.
	 * @returns `this`, for chaining.
	 */
	registerResource(resourceType: Class): this;
	/**
	 * Registers an event type in the world. Called automatically for all event readers/writers when a system is added.
	 * @param resourceType The Event type (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerEvent(eventType: Struct): this;
	/**
	 * Registers a message channel for threads. When a thread receives a message, it will run the callback created by `listenerCreator`.
	 * @param channel The **_unique_** name of the channel. _NOTE: Calling this method again with the same channel will override the previous listener!_
	 * @param listenerCreator A creator function that will be called with the world when built. Should return a function that receives whatever data that is sent across threads, and returns data to be sent back.
	 * @returns `this`, for chaining.
	 */
	registerThreadChannel(channel: ThreadMessageChannel<any, any>): this;
	/**
	 * Sets the Executor that this world will use.
	 * @param executor The Executor to use.
	 * @returns `this`, for chaining.
	 */
	setExecutor(executor: ExecutorType): this;
	/**
	 * Builds the world.
	 * `World` instances cannot add new systems or register new types.
	 * @returns `Promise<World>`
	 */
	build(): Promise<World>;
}

declare class World {
	#private;
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	archetypes: Table[];
	queries: Query<any, any>[];
	resources: object[];
	eventReaders: EventReader<any>[];
	eventWriters: EventWriter<any>[];
	systems: ((...args: any[]) => any)[];
	arguments: any[][];
	commands: Commands;
	entities: Entities;
	config: Readonly<WorldConfig>;
	threads: ThreadGroup;
	executor: ExecutorInstance;
	components: Struct[];
	constructor(
		config: WorldConfig,
		threads: ThreadGroup,
		executor: ExecutorType,
		components: Struct[],
		resourceTypes: Class[],
		eventTypes: Struct[],
		systems: SystemDefinition[],
		dependencies: SystemDependencies[],
		channels: ThreadMessageChannel[],
	);
	update(): Promise<void>;
	moveEntity(entityId: bigint, targetTableId: bigint): void;
}

export {
	Entity,
	Plugin,
	World,
	WorldBuilder,
	WorldConfig,
	applyCommands,
	createThreadChannel,
	definePlugin,
	defineSystem,
	dropStruct,
	initStruct,
	struct,
};
