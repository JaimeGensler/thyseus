# Complete API Docs

## `WorldBuilder`

### Methods

#### `addSystem(system: SystemDefinition): this`

Adds a system to the world that will be added to the normal execution queue.
Processes its parameter descriptors, which handle additional registration/setup.
Returns the `WorldBuilder` instance, for chaining.

#### `addStartupSystem(system: SystemDefinition): this`

Adds a system to the world _**that will only be run once when built**_. Returns
the `WorldBuilder` instance, for chaining.

#### `addPlugin(plugin: Plugin): this`

Passes the WorldBuilder to the provided plugin function. Returns the
`WorldBuilder` instance, for chaining.

#### `registerComponent(componentType: Struct): this`

Registers a Component in the world. Internally deduplicates, so register may
safely be called multiple times with the same component. Returns the
`WorldBuilder` instance, for chaining.

_`Query` parameters automatically call this for all queried/filtered components
when a system is added._

#### `registerResource(resourceType: Class): this`

Registers a Resource in the world. Internally deduplicates, so register may
safely be called multiple times with the same resource. Returns the
`WorldBuilder` instance, for chaining.

_`Res` parameters automatically call this for needed resources when a system is
added._

#### `registerEvent(eventType: Struct): this`

Registers an event type in the world. Internally deduplicates, so register may
safely be called multiple times with the same resource. Returns the
`WorldBuilder` instance, for chaining.

_`EventReader` and `EventWriter` parameters automatically call this for needed
resources when a system is added._

#### `registerThreadChannel(channel: ThreadMessageChannel<any, any>): this`

Registers a message channel for threads, usually created by
`createThreadChannel`. When a thread receives a message, it will run the
callback created by `listenerCreator`. Returns the `WorldBuilder` instance, for
chaining.

#### `setExecutor(executor: ExecutorType): this`

Sets the Executor that this world will use. Returns the `WorldBuilder` instance,
for chaining.

#### `async build(): Promise<World>`

Constructs threads, builds the world, initializes resource, creates system
parameters, and runs startup systems, returning a `Promise` that resolves to a
`World`.

### Properties

#### `systems: SystemDefinition[];`

The systems that have been added. This array is readonly - systems must only be
added with `addSystem`!

## `World`

### Methods

#### `static new(config?: Partial<WorldConfig>, url?: string | URL,): WorldBuilder`

Returns a new `WorldBuilder`. Completes the provided `WorldConfig` with default
config. In dev, validates that the passed config (including URL) is valid.

#### `async update(): Promise<void>`

Updates the world. This calls `start()` on the provided Executor, running all of
your systems **once**. Usually called in a loop, like with
`window.requestAnimationFrame`.
