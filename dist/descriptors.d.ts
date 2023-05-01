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

type Plugin = (worldBuilder: WorldBuilder) => void;

type SystemParameter = {
    isLocalToThread(): boolean;
    intersectsWith(other: unknown): boolean;
    onAddSystem(worldBuilder: WorldBuilder): void;
    intoArgument(world: World): any;
};
type System = ((...args: any[]) => void | Promise<void>) & {
    parameters?: SystemParameter[];
};

declare class SystemConfig {
    dependents: System[];
    dependencies: System[];
    isFirst: boolean;
    isLast: boolean;
    system: System;
    constructor(system: System);
    /**
     * Specifies that this system must run _before_ the provided systems may run.
     * @param ...systems The systems that this system must run before.
     * @returns `this`, for chaining.
     */
    before(...systems: System[]): this;
    /**
     * Specifies that this system must run _after_ the provided systems have run.
     * @param ...systems The systems that this system must run after.
     * @returns `this`, for chaining.
     */
    after(...systems: System[]): this;
    /**
     * Specifies that this system should try to run before any other systems in the schedule have run.
     * Systems ordered to run before this will still run before.
     * @returns `this`, for chaining.
     */
    first(): this;
    /**
     * Specifies that this system should try to run after all other systems in the schedule have run.
     * @returns `this`, for chaining.
     */
    last(): this;
}

type ExecutorInstance = {
    start(): Promise<void>;
    get length(): number;
};
type ExecutorType = {
    fromWorld(world: World, systems: (System | SystemConfig)[], systemArguments: any[][]): ExecutorInstance;
};

type WorldConfig = {
    threads: number;
    isMainThread: boolean;
    getNewTableSize(prev: number): number;
    memorySize: number;
    useSharedMemory: boolean;
};
type SingleThreadedWorldConfig = WorldConfig & {
    threads: 1;
};

type SystemList = (System | SystemConfig)[];
declare class WorldBuilder {
    #private;
    schedules: Record<symbol, SystemList>;
    components: Set<Struct>;
    resources: Set<Class>;
    events: Set<Struct>;
    defaultExecutor: ExecutorType;
    executors: Record<symbol, ExecutorType>;
    config: Readonly<WorldConfig>;
    url: Readonly<string | URL | undefined>;
    constructor(config: WorldConfig, url: string | URL | undefined);
    /**
     * Adds systems to the default schedule of the world (`CoreSchedule.Main`).
     * @param systems The systems to add.
     * @returns `this`, for chaining.
     */
    addSystems(...systems: SystemList): this;
    /**
     * Adds systems to the specified schedule.
     * @param schedule The schedule to add the systems to.
     * @param systems The systems to add.
     * @returns `this`, for chaining.
     */
    addSystemsToSchedule(schedule: symbol, ...systems: SystemList): this;
    /**
     * Passes this WorldBuilder to the provided plugin function.
     * @param plugin The plugin to pass this WorldBuilder to.
     * @returns `this`, for chaining.
     */
    addPlugin(plugin: Plugin): this;
    /**
     * Registers a component type in the world.
     * Called automatically for all queried components when a system is added.
     * @param componentType The componentType (`Struct`) to register.
     * @returns `this`, for chaining.
     */
    registerComponent(componentType: Struct): this;
    /**
     * Registers a resource type in the world.
     * Called automatically for all accessed resources when a system is added.
     * @param resourceType The Resource type (`Class`) to register.
     * @returns `this`, for chaining.
     */
    registerResource(resourceType: Class): this;
    /**
     * Registers an event type in the world.
     * Called automatically for all event readers/writers when a system is added.
     * @param resourceType The Event type (`Struct`) to register.
     * @returns `this`, for chaining.
     */
    registerEvent(eventType: Struct): this;
    /**
     * Sets the executor that schedules will use by default.
     * Individual schedules can specify their own executor; if they do not, this executor will be used.
     * @param executor The executor type to use by default.
     * @returns `this`, for chaining.
     */
    setDefaultExecutor(executor: ExecutorType): this;
    /**
     * Sets the executor to use for a specific schedule.
     * @param schedule The schedule.
     * @param executor The executor type for this schedule.
     * @returns `this`, for chaining.
     */
    setExecutorForSchedule(schedule: symbol, executor: ExecutorType): this;
    /**
     * Builds the world.
     * @returns `Promise<World>`
     */
    build(): Promise<World>;
}

type NotFunction$1<T> = T extends Function ? never : T;
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
    add<T extends object>(component: NotFunction$1<T>): this;
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

declare class EntityCommands extends BaseEntity {
    #private;
    constructor(commands: Commands, id: bigint);
    get id(): bigint;
}

type NotFunction<T> = T extends Function ? never : T;
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
    insertInto<T extends object>(entityId: bigint, component: NotFunction<T>): void;
    insertTypeInto(entityId: bigint, componentType: Struct): void;
    removeFrom(entityId: bigint, componentType: Struct): void;
    [Symbol.iterator](): Generator<Command, void, unknown>;
    pushCommand(size: number, type: number): number;
    reset(): void;
}

declare class CommandsDescriptor$1 implements SystemParameter {
    isLocalToThread(): boolean;
    intersectsWith(other: unknown): boolean;
    intoArgument(world: World): Commands;
    onAddSystem(builder: WorldBuilder): void;
}

declare class WorldDescriptor$1 implements SystemParameter {
    isLocalToThread(): boolean;
    intersectsWith(other: unknown): boolean;
    intoArgument(world: World): World;
    onAddSystem(builder: WorldBuilder): void;
}

declare class ResourceDescriptor$1<T extends Class | Mut$1<Class>> implements SystemParameter {
    resourceType: Class;
    canWrite: boolean;
    constructor(resource: T);
    isLocalToThread(): boolean;
    intersectsWith(other: unknown): boolean;
    onAddSystem(builder: WorldBuilder): void;
    intoArgument(world: World): T extends Mut$1<infer X> ? X : Readonly<InstanceType<T extends Class ? T : never>>;
}

declare class SystemResourceDescriptor$1<T extends object> implements SystemParameter {
    resourceType: Class;
    constructor(resource: {
        new (): T;
    });
    isLocalToThread(): boolean;
    intersectsWith(other: unknown): boolean;
    onAddSystem(builder: WorldBuilder): void;
    intoArgument({ threads }: World): Promise<T>;
}

declare class EventReader<T extends object> {
    #private;
    constructor(commands: Commands, struct: Struct & {
        new (): T;
    }, pointer: number, instance?: T);
    /**
     * The event type (struct) for this queue.
     */
    get type(): Struct;
    /**
     * The number of events currently in this queue.
     */
    get length(): number;
    [Symbol.iterator](): this extends EventWriter<any> ? Iterator<T> : Iterator<Readonly<T>>;
    /**
     * Sets this event queue to be cleared when commands are next processed.
     */
    clear(): void;
}
declare class EventWriter<T extends object> extends EventReader<T> {
    #private;
    constructor(commands: Commands, struct: Struct & {
        new (): T;
    }, pointer: number);
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

declare class EventReaderDescriptor$1<T extends Struct> implements SystemParameter {
    eventType: T;
    constructor(eventType: T);
    isLocalToThread(): boolean;
    intersectsWith(other: unknown): boolean;
    onAddSystem(builder: WorldBuilder): void;
    intoArgument(world: World): EventReader<InstanceType<T>>;
}
declare class EventWriterDescriptor$1<T extends Struct> extends EventReaderDescriptor$1<T> {
    intoArgument(world: World): EventWriter<InstanceType<T>>;
}

type SendableType = void | null | undefined | boolean | number | string | bigint | ArrayBuffer | SharedArrayBuffer | Uint8Array | Uint16Array | Uint32Array | BigUint64Array | Int8Array | Int16Array | Int32Array | BigInt64Array | Float32Array | Float64Array | Uint8ClampedArray | DataView | Date | RegExp | Blob | File | FileList | ImageBitmap | ImageData | SendableType[] | {
    [key: string]: SendableType;
} | Map<SendableType, SendableType> | Set<SendableType>;
type ThreadMessageEvent = MessageEvent<[string, number, SendableType]> & {
    currentTarget: WorkerOrGlobal;
};
type WorkerOrGlobal = {
    postMessage(content: SendableType): void;
    addEventListener(type: 'message', fn: (event: ThreadMessageEvent) => void): void;
    removeEventListener(type: 'message', fn: (event: ThreadMessageEvent) => void): void;
};
type ThreadGroupConfig = {
    count: number;
    url: string | URL | undefined;
    isMainThread: boolean;
};
declare class ThreadGroup {
    #private;
    static new({ count, url, isMainThread }: ThreadGroupConfig): ThreadGroup;
    isMainThread: boolean;
    constructor(threads: WorkerOrGlobal[], isMainThread: boolean);
    setListener<I extends SendableType[], O extends SendableType>(channelName: string, listener: (...args: I) => O): void;
    deleteListener(channelName: string): void;
    /**
     * Sends a value to a channel.
     * @param channel The channel to send the value to.
     * @param message The value to send.
     * @returns A promise, resolves to an array of results from all threads.
     */
    send<T extends unknown>(channel: string, data: SendableType): Promise<T[]>;
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

declare class World {
    #private;
    /**
     * Constructs and returns a new `WorldBuilder`.
     * @param config The config of the world.
     * @returns A `WorldBuilder`
     */
    static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
    /**
     * Constructs and returns a new `WorldBuilder`.
     * @param config The config of the world.
     * @param url The url to provide to workers. **This should always be `import.meta.url`.**
     * @returns A `WorldBuilder`.
     */
    static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
    archetypes: Table[];
    queries: Query<any, any>[];
    resources: object[];
    eventReaders: EventReader<any>[];
    eventWriters: EventWriter<any>[];
    schedules: Record<symbol, ExecutorInstance>;
    commands: Commands;
    entities: Entities;
    config: Readonly<WorldConfig>;
    threads: ThreadGroup;
    components: Struct[];
    constructor(config: WorldConfig, threads: ThreadGroup, components: Struct[], resourceTypes: Class[], eventTypes: Struct[]);
    /**
     * Starts execution of the world.
     */
    start(): void;
    /**
     * Runs the specified schedule.
     * Throws if that schedule cannot be found.
     * @param schedule The schedule to run.
     * @returns A promise that resolves when the schedule has completed
     */
    runSchedule(schedule: symbol): Promise<void>;
    /**
     * Gets the resource (instance) of the passed type.
     * @param resourceType The type of the resource to get.
     * @returns The resource instance.
     */
    getResource<T extends Class>(resourceType: T): InstanceType<T>;
    moveEntity(entityId: bigint, targetTableId: bigint): void;
}

declare class Table {
    #private;
    static createEmptyTable(world: World): Table;
    static createRecycledTable(world: World): Table;
    static create(world: World, components: Struct[], bitfield: bigint, id: number): Table;
    bitfield: bigint;
    constructor(world: World, sizedComponents: Struct[], pointer: number, bitfield: bigint, id: number);
    get pointer(): number;
    get id(): number;
    get capacity(): number;
    get length(): number;
    set length(value: number);
    getColumn(componentType: Struct): number;
    hasColumn(componentType: Struct): boolean;
    delete(index: number): void;
    move(index: number, targetTable: Table): bigint;
    grow(): void;
    copyComponentIntoRow(row: number, componentType: Struct, copyFrom: number): void;
    getColumnPointer(componentType: Struct): number;
    getTableSizePointer(): number;
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
    /**
     * Verifies if an entity has a specific component type.
     * @param entityId The id of the entity
     * @param componentType The type (class) of the component to detect.
     * @returns `boolean`, true if the entity has the component and false if it does not.
     */
    hasComponent(entityId: bigint, componentType: Struct): boolean;
    resetCursor(): void;
    getTableIndex(entityId: bigint): number;
    setTableIndex(entityId: bigint, tableIndex: number): void;
    getRow(entityId: bigint): number;
    setRow(entityId: bigint, row: number): void;
    getBitset(entityId: bigint): bigint;
}

declare class Optional$1<T extends object | Mut$1<object>> {
    #private;
    constructor(value: T | {
        new (...args: any): T;
    });
    get value(): Struct | Mut$1<any>;
}
declare class Mut$1<T extends object> {
    #private;
    constructor(value: {
        new (...args: any): T;
    });
    get value(): Struct;
}
declare class With$1<T extends object | object[]> {
    #private;
    constructor(value: {
        new (...args: any): T;
    } | {
        new (...args: any): T;
    }[]);
    get value(): Struct | Struct[];
}
declare class Without$1<T extends object | object[]> {
    #private;
    constructor(value: {
        new (...args: any): T;
    } | {
        new (...args: any): T;
    }[]);
    get value(): Struct | Struct[];
}
type OrContent = With$1<object> | Without$1<object> | Or$1<OrContent, OrContent> | OrContent[];
declare class Or$1<L extends OrContent, R extends OrContent> {
    #private;
    constructor(l: L, r: R);
    get l(): OrContent;
    get r(): OrContent;
}
type Filter = With$1<any> | Without$1<any> | Or$1<any, any> | Filter[];

type Accessors = object | object[];
type QueryIteration<A extends Accessors> = A extends any[] ? {
    [Index in keyof A]: IteratorItem<A[Index]>;
} : IteratorItem<A>;
type IteratorItem<I> = I extends Optional$1<infer X> ? X extends Mut$1<infer Y> ? Y | null : Readonly<X> | null : I extends Mut$1<infer X> ? X : Readonly<I>;
declare class Query<A extends Accessors, F extends Filter = []> {
    #private;
    constructor(withFilters: bigint[], withoutFilters: bigint[], isIndividual: boolean, components: Struct[], world: World);
    /**
     * The number of entities that match this query.
     */
    get length(): number;
    [Symbol.iterator](): Iterator<QueryIteration<A>>;
    forEach(callback: (...components: A extends any[] ? QueryIteration<A> : [QueryIteration<A>]) => void): void;
    testAdd(table: Table): void;
}

type AccessDescriptor = Struct | Mut$1<object> | Optional$1<object> | Optional$1<Mut$1<object>>;
type UnwrapElement<E extends any> = E extends Class ? InstanceType<E> : E;
declare class QueryDescriptor$1<A extends AccessDescriptor | AccessDescriptor[], F extends Filter = []> implements SystemParameter {
    components: Struct[];
    writes: boolean[];
    optionals: boolean[];
    filters: F;
    isIndividual: boolean;
    constructor(accessors: A | [...(A extends any[] ? A : never)], filters?: F);
    isLocalToThread(): boolean;
    intersectsWith(other: unknown): boolean;
    onAddSystem(builder: WorldBuilder): void;
    intoArgument(world: World): Query<A extends any[] ? {
        [Index in keyof A]: UnwrapElement<A[Index]>;
    } : UnwrapElement<A>, F>;
}

declare const CommandsDescriptor: () => CommandsDescriptor$1;
declare const QueryDescriptor: <A extends AccessDescriptor | AccessDescriptor[], F extends Filter = []>(accessors: A | [...A extends any[] ? A : never], filters?: F | undefined) => QueryDescriptor$1<A, F>;
declare const ResourceDescriptor: <T extends Class | Mut$1<Class>>(resource: T) => ResourceDescriptor$1<T>;
declare const SystemResourceDescriptor: <T extends object>(resource: new () => T) => SystemResourceDescriptor$1<T>;
declare const WorldDescriptor: () => WorldDescriptor$1;
declare const EventReaderDescriptor: <T extends Struct>(eventType: T) => EventReaderDescriptor$1<T>;
declare const EventWriterDescriptor: <T extends Struct>(eventType: T) => EventWriterDescriptor$1<T>;
declare const Mut: <T extends object>(value: new (...args: any) => T) => Mut$1<T>;
declare const With: <T extends object | object[]>(value: (new (...args: any) => T) | (new (...args: any) => T)[]) => With$1<T>;
declare const Without: <T extends object | object[]>(value: (new (...args: any) => T) | (new (...args: any) => T)[]) => Without$1<T>;
declare const Optional: <T extends object | Mut$1<object>>(value: T | (new (...args: any) => T)) => Optional$1<T>;
declare const Or: <L extends OrContent, R extends OrContent>(l: L, r: R) => Or$1<L, R>;

export { CommandsDescriptor, EventReaderDescriptor, EventWriterDescriptor, Mut, Optional, Or, QueryDescriptor, ResourceDescriptor, SystemResourceDescriptor, With, Without, WorldDescriptor };
