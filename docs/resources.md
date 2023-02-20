# Resources

Resources are world-unique data that exist for the entire lifetime of the world.
This means that, unlike components, they are not tied to a specific entity.
Resources are the ideal way to handle things like time (frame number, delta,
etc.), renderers, inputs, and other data that is unique to a world.

In many other ECS designs, resources are modeled as singleton components; that
is, they are components that are only ever added to a single entity. This
pattern is common enough that Thyseus makes resources their own distinct
concept - if you're migrating from another ECS, this is the recommended way to
migrate singletons.

## Defining Resources

Like components, resources are classes. Unlike components, they can be, but are
not required to be, decorated with `@struct`. Resources decorated with `@struct`
will be accessible from any thread, while resources that are not will only be
accessible on the main thread.

```ts
import { struct } from 'thyseus';

// Systems using this resource could be called from any thread
@struct
class Time {
	@struct.f64 declare previous: number;
	@struct.f64 declare current: number;
	@struct.f64 declare delta: number;
	@struct.u32 declare frameNumber: number;
}

// Systems using this resource will only be called from the main thread
class Renderer {
	draw() {
		// ...
	}
}
```

When these resources are used by systems, they will be refering to the same
object (or, the same data for structs in worker threads):

```ts
import { defineSystem } from 'thyseus';

class MyResource {}

const systemA = defineSystem(
	({ Res }) => [Res(MyResource)],
	function (myResource) {
		// myResource here...
	},
);
const systemB = defineSystem(
	({ Res }) => [Res(MyResource)],
	function (myResource) {
		// ... is the same object as myResource here!
	},
);
```

As mentioned, resources are **world-unique** - only one instance of a class will
be constructed per world. If you have a type you'd like to use more than once,
you can simply subclass it.

```ts
// There can only be one `MyResource` instance per thread...
class MyResource {}

// ...but if we subclass it, it's a different type!
class MyOtherResource extends MyResource {}
```

## Initializing Resources

In some cases, you may want to access your resource from any thread, but it must
run some initialization on the main thread. For these cases, we can implement a
special `initialize` method that will be called when the world is built. Let's
consider a `Keyboard` resource that tracks inputs.

```ts
import { struct } from 'thyseus';

@struct
class Keyboard {
	@struct.bool declare W: boolean;
	@struct.bool declare A: boolean;
	@struct.bool declare S: boolean;
	@struct.bool declare D: boolean;
}
```

Hypothetically, there's no reason the state of the keyboard shouldn't be read
from any thread. However, we need to set up event listeners to capture
`'keydown'` and `'keyup'` events, which _does_ need to happen only on the main
thread. Constructors are called on both threads, so that's not an option,
either - this is the perfect use for an `initialize` method!

```ts
import { struct, type World } from 'thyseus';

@struct
class Keyboard {
	@struct.bool declare W: boolean;
	@struct.bool declare A: boolean;
	@struct.bool declare S: boolean;
	@struct.bool declare D: boolean;

	// This will be called once, on the main thread, while the world is being built.
	initialize(world: World) {
		// You can safely access APIs only available in the main thread here.
		const handler = (e: KeyboardEvent) => {
			const isHeld = e.type === 'keydown';
			if (e.code === 'KeyA') {
				this.A = isHeld;
			}
			if (e.code === 'KeyD') {
				this.D = isHeld;
			}
		};
		window.addEventListener('keydown', handler);
		window.addEventListener('keyup', handler);
	}
}
```

As you can see above, you can put any setup code you need in this method. If
your resource has an `initialize` method, it'll be called once with the world
initializing when that world is being built. If your setup is async, the
`initialize` method is also allowed to return a promise, which will be `await`ed
before continuing to build the world.

Resources are not required to have an `initialize` method, **but it will be
called if it exists** - you cannot use this method name for something else!

## System Resources

System Resources are a variation of resources that are unique _per system_,
rather than per world. This means that multiple system resources of the same
type can exist in the world. System resources are always considered mutable, as
they are owned by a single system. A single system may also have multiple of the
same type of system resource, each containing different values. For example:

```ts
import { defineSystem, struct } from 'thyseus';

@struct
class A {
	@struct.u32 declare value: number;
}

const mySystem = defineSystem(
	({ SystemRes }) => [SystemRes(A), SystemRes(A)],
	function mySystem(a1, a2) {
		console.log(a1 !== a2); // -> true
	},
);
```

In the above example, _two_ system resources are created for our system, each
with their own values.

If using multithreading, system resources - like normal resources - will be
considered callable from any thread if decorated by `@struct`, and will be bound
to the main thread otherwise. For structs, their values will be consistent
across threads, making them a good replacement for mutable local closures, if
necessary.

Apart from their scope, system resources function identically to normal
resources, `initialize` and all. In fact, the same class could be used both as a
system resource and as a world resource!
