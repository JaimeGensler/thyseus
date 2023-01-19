# Systems

Systems are where the functionality of an ECS comes in - they are responsible
for reading & writing the data in your world.

Taking heavy inspiration from [bevy](https://bevyengine.org/), Thyseus models
systems as functions with particular parameters. Systems can have 0 or more
parameters and can have multiple of the same type of parameter. This design
means you never have to worry about _how_ data gets to your system - it just
does!

## Parameter Descriptors

In order for Thyseus to know what data your system needs and whether it's
reading or writing that data, it requires you to provide "parameter
descriptors." As the name implies, a parameter descriptor describes parameters -
specifically, the type of data that each parameter is supposed to be.

There are four system parameters provided out of the box, but you can also
[create your own](./advanced_patterns/custom_system_parameters.md):

-   `Query`
    -   Queries for entities with a specific set of components.
    -   Intersects with systems that access the same components _and_ one of
        those systems has write access to the same components.
    -   Is accessible from any thread.
-   `Res` (Resource)
    -   Gives you access to a specific resource. If your resource is wrapped in
        `Mut`, gives you write access to a specific resource.
    -   Intersects with systems that access the same resource _and_ one of those
        systems has write access to the resource.
    -   Is accessible from any thread _if_ the resource is a struct. Else,
        accessible from the main thread only.
-   `Commands`
    -   Gives you the `Commands` object. This lets you spawn & despawn entities,
        as well as insert components on or remove components from entities.
    -   Does not intersect with other systems.
    -   Is accessible from any thread.
-   `World`
    -   Gives you full access to the world and all of its data.
    -   Intersects with all other systems (_except_ zero-parameter systems).
    -   Is only accessible from the main thread.

Thyseus also provides a `Mut` modifier, which can be used to request data as
mutable for queries and resources.

More modifiers are provided for queries -
[read about them on the queries page](./queries.md)

## Defining A System

Defining a system requires two functions - one to create the parameter
descriptors, and the system function itself. Let's look at a couple examples.

```ts
import { struct, defineSystem } from 'thyseus';

@struct()
class Vec2 {
	@struct.f64() declare x: number;
	@struct.f64() declare y: number;
}
class Position extends Vec2 {}
class Velocity extends Vec2 {}

const spawnerSystem = defineSystem(
	({ Commands }) => [Commands()],
	function spawnerSystem(commands) {
		commands.spawn().addType(Position).addType(Velocity);
	},
);
const moveSystem = defineSystem(
	({ Query, Mut }) => [Query([Mut(Position), Velocity])],
	function moveSystem(query) {
		for (const [pos, vel] of query) {
			pos.x += vel.x;
			pos.y += vel.y;
		}
	},
);
```

In the above example, `spawnerSystem` specifies that it needs a `Commands`
parameter. When the function is called, the first (and only, in this case)
argument it receives will be the `Commands` instance for the world it was added
to. From there, the system can do whatever it needs to do - in the above case,
spawn an entity and add the `Position` and `Velocity` components to it.

The `moveSystem` specifies that it needs a query matching all entities with the
`Position` and `Velocity` components, and declares that it will mutate
`Position`. In the system, we iterate over the `Position` and `Velocity`
components of all entities that match the query!

As mentioned above, your systems can get much more complex, including using
multiple queries, requesting access to resources, or accessing the world itself.
These are just the basics!

> You aren't required to use arrow functions or regular functions for either
> function passed to defineSystem - do whatever makes sense for you!.
> Internally, we prefer the above style for a few reasons:
>
> 1. It makes use of implicit return for the descriptors
> 2. It Visually distinguishes the descriptors from the system itself
> 3. It provides an explicit name for the system function, for easier error
>    tracing.

## Dependencies

By default, Thyseus makes no guarantees about the order in which systems will be
executed. It may change from execution to execution, or when building the same
world again. Even if an execution order appears stable, the implementation of
Executors may change in a minor or patch update and the execution order may
change.

If you'd like to specify an order between systems, Thyseus provides a Dependency
API. `defineSystem` returns a `SystemDefinition`, which allows you to specify
dependencies between systems (or general dependencies, if needed).

```ts
import { defineSystem, World } from 'thyseus';
const systemA = defineSystem(/* ... */);
const systemB = defineSystem(/* ... */);
const systemC = defineSystem(/* ... */);
const systemD = defineSystem(/* ... */);
const systemE = defineSystem(/* ... */);

const myWorld = await World.new()
	.addSystem(systemA.before(systemB))
	.addSystem(systemB.after(systemC))
	.addSystem(systemE.afterAll())
	.addSystem(systemD.beforeAll());
```

Dependencies are cleared immediately after being read by world builders, and so
must be set for every world a system is registered in - this is why it is
recommended to declare dependencies in-line or in the same module a world
registers them in.

**Both explicit (`before`, `after`) and implicit (`beforeAll`, `afterAll`)
dependencies apply only to systems that intersect.** For example, if systems `A`
and `B` are disjoint, then `A before B` will have no effect. Similarly,
`A beforeAll` _will **not**_ guarantee that `A` runs before `B` (but will
guarantee that `A` runs before any other systems that `A` intersects with).

Also note that explicit dependencies take precedence over implicit dependencies.
Given intersecting `A` and `B`, `(B beforeAll), (A before B)` will guarantee
that A runs before B. If no explicit resolution is provided, implicit
dependencies are evaluated _in the order they are passed in_. For example, given
`(A beforeAll), (B beforeAll)`, `A` will be guaranteed to execute before `B`.
Given `(A afterAll), (B afterAll)`, `A` will be guaranteed to execute _after_
`B`.

Lastly, contradictory dependencies - such as `A after A` or
`(A before B), (B before A)` - will cause an error to be thrown when the world
is built.
