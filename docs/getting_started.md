# Getting Started

Thyseus is designed around `World`s, where each World is a collection of
entities, components (and other data), and systems. Every World is independent;
systems and types can be used by multiple worlds, but all data (e.g. entities
and their components) has a single world that owns it. Projects using Thyseus
may use only one world, or they may use multiple - it's up to you to decide what
makes the most sense for your use case.

## Building Your World

`World`s require a lot of information to be constructed correctly, so Thyseus
uses the builder pattern to help setup:

```ts
import { World } from 'thyseus';

const myWorldBuilder = World.new();
```

`WorldBuilder`s are responsible for registering all systems, components,
resources, and events that will be used in a particular World. **All** systems
and types must be registered in order to be used in a world; it is not possible
to add new systems post-construction, or to register new types.

Fortunately, you typically only need to worry about adding systems to your
world; system parameters handle registering the types they use. For example,
queries will register the components they query/filter for, resources will
register their resource types, and so on:

```ts
import { World, defineSystem } from 'thyseus';
import { ComponentA, ComponentB, MyResource } from './anotherModule';

const mySystem = defineSystem(
	({ Query, With, Res }) => [
		Query(ComponentA, With(ComponentB)),
		Res(MyResource),
	],
	function mySystem(query, resource) {
		// ...
	},
);

// This will add the system to the world,
// register components ComponentA & ComponentB
// and register the resource MyResource
const myWorldBuilder = World.new().addSystem(mySystem);
```

> In rare cases, you may need to register some types manually - the
> [API Docs](./complete_api_docs.md) cover all registration methods. Also note
> that registration handles deduplicating types, so you never need to worry
> about registering types multiple times.

All registration methods on `WorldBuilder`s return the same `WorldBuilder` so
they can be chained:

```ts
import { World } from 'thyseus';
import { coolPlugin } from 'a-third-party-library';
import { systemA, systemB, systemC, systemD } from './someModule';

const myWorldBuilder = World.new()
	.addPlugin(coolPlugin)
	.addSystem(systemA)
	.addSystem(systemB)
	.addSystem(systemC)
	.addSystem(systemD);
```

`World.new()` also accepts some configuration, which can be found in the
[API Docs](./complete_api_docs.md)

## Startup Systems

Most worlds will need a system or systems that only run once and handle some
setup, such as spawning initial entities. For these, you can add "startup"
systems:

```ts
import { World } from 'thyseus';
import { spawnInitialEntitiesSystem } from './loadGameWorld';

const myWorldBuilder = World.new().addStartupSystem(spawnInitialEntitiesSystem);
```

Startup systems register types like any other system, but will only ever be
called once, when the world is built.

## Plugins

Plugins are simply functions that accept a `WorldBuilder` instance and register
systems and types on that `WorldBuilder`. If you're building a third party
library to be used with Thyseus, it's recommended that you model it as a plugin,
even if it only registers a single system! Plugins give you the flexibility to
change the implementation details of your library (e.g., reorganize into
multiple systems) without changing the external API.

You can also use plugins in your own code to group related functionality that
may be needed in multiple worlds. Thyseus exports a `definePlugin` function for
type help:

```ts
import { definePlugin } from 'thyseus';

const myPlugin = definePlugin(builder => {
	// Whatever you need to do with the builder in here!
	builder.addSystem(/* ... */);
});
```

## Constructing a World

Once you've added all your systems and registered your types, it's time to build
the world! This can be done with the `build()` method on `WorldBuilder`. This
function returns a `Promise<World>` - construction and setup is async!

```ts
import { World } from 'thyseus';

const myWorld = await World.new()
	// ...
	// Add systems, plugins, whatever you need!
	// ...
	.build();
```

> Top-level await is a convenient way to handle the promise returned by
> `build()`, but it isn't required - you can handle it however you'd like!

When you call `build()`, threads will be created (if multithreading is being
used), the world will be constructed, resources will be initialized, system
parameters will be created, and startup systems will be run.

Once your world is built, you can start executing systems with
`myWorld.update()`.

```ts
import { myWorld } from './myWorldModule';

async function loop() {
	await myWorld.update();
	requestAnimationFrame(loop);
}
loop();
```

And you're using Thyseus! As mentioned above, built worlds cannot register new
types or systems, so make sure you add anything you need in the builder!
