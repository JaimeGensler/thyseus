# Rules

Thyseus strives to make multithreading trivially easy without introducing new or
unpredictable behavior. In particular, it aims to require _few, if any_ changes
to your code for you to enjoy the benefits of running your code on multiple
threads, or to switch back to singlethreaded execution if necessary.

Nevertheless, there are still a few rules for multithreading to work.

It is generally suggested that you follow all of these rules (with the exception
of the first) _regardless of whether you intend to use multithreading_, so that
you may opt-in to multithreading with ease and for the simplicity and
maintainability of your own code.

## Module-Type Workers and SharedArrayBuffers are required.

Thyseus' multithreading model is centered around these two technologies - if
either of these is not available in your target environment for some reason,
then you unfortunately will not be able to leverage Thyseus' multithreading
capabilities.

## The order that systems and plugins are added in must be stable

Thyseus uses the registration order of systems, components, and resources in
order to identify them between threads. As a result, passing anything other than
`import.meta.url` as the second argument for `World.new()` or randomizing the
order systems or plugins are registered in will almost always result in
incorrect behavior.

Bad:

```ts
const myWorld = await World.new({ threads: 2 }, './aDifferentModule');
```

Also Bad:

```ts
const myWorldBuilder = await World.new({ threads: 2 }, import.meta.url)
	// There's really no use case for this, anyway...
	.addSystem(Math.random() > 0.5 ? systemA : systemB)
	.build();
```

Good:

```ts
const myWorldBuilder = await World.new({ threads: 2 }, import.meta.url)
	.addSystem(systemA)
	.addSystem(systemB)
	.addSystem(systemC)
	// ... and so on ...
	.build();
```

It is permissible to conditionally register systems or plugins **_only if_** the
conditions are consistent between threads.

## The module the world is built in should not (unconditionally) run `world.update`

`world.update()` is designed to be called on the main thread, and internally it
communicates with other threads to run systems in parallel. Calling this method
on multiple threads will have unpredictable results.

Bad:

```ts
const world = await World.new().build();

async function update() {
	await world.update();
	requestAnimationFrame(update);
}
update();
```

Better, but not great:

```ts
const world = await World.new().build();

// Check if this is the main thread
if (globalThis.document) {
	async function update() {
		await world.update();
		requestAnimationFrame(update);
	}
	update();
}
```

Best:

```ts
// ModuleA
export const world = await World.new().build();

// ModuleB (application entry)
import { world } from './ModuleA';

async function update() {
	await world.update();
	requestAnimationFrame(update);
}
update();
```

## The module the world is built in, _or any module it imports_, should not have top-level references to context-specific APIs.

Workers run in a different context than the main thread, so some APIs available
on the main thread are not available in workers. As a result, there should be no
top-level references (i.e., not contained in a function) to window-only objects
in the module the world is built in _or any module it imports_. Resources can
safely access any main thread APIs in their `initialize` method, and
thread-local resources can refer to window-only objects in their
constructor/methods.

Technically, if you know a system is thread-local, you may also include
window-only objects in system bodies, but this is generally not recommended.

## Systems must not rely on closures over mutable local variables

This requirement is the most likely to require changes to your code. Any system
that is not bound to the main thread can run on _any thread, any frame_. As a
result, anything a system mutates from the surrounding scope will not have
predictable values, unless that system is bound to the main thread (and even
still, this is not recommended).

Constants will work just fine, so long as they do not depend on script execution
context (like accessing `document`).

Bad:

```ts
let myLocalCounter = 0;
function aSystem() {
	myLocalCounter++;
	console.log(myLocalCounter); // This will not have a predictable value!
}
```

Also bad:

```ts
const myLocalArray = [];
function anotherSystem() {
	myLocalArray.push('a value');
	console.log(myLocalCounter); // This will not have predictable contents!
}
```

Good:

```ts
const myConstant = 5;
const myCollectionOfConstants = {
	a: 1,
	b: 2,
	c: 3,
} as const;

function aSystem() {
	// This will always be 5!
	console.log(myConstant);

	// As long as you don't mutate values, this will behave well.
	console.log(myCollectionOfConstants);
}
```
