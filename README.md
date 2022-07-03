# Thyseus

Thyseus is a multi-threaded, type-safe, DX-focused, and highly performant
[Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system)
(ECS) built entirely in Typescript. It includes (or will include) many features
out of the box, including:

-   A simple yet expressive and type-safe API.
-   Hassle-free multithreading. Don't worry about `Atomic`s, Mutexes, or
    workers - just write your systems and we'll take care of the rest.
-   _**A safety-first approach!**_ No `eval`, `new Function()`, or creating
    workers from blobs - Thyseus leverages recent additions to the language (and
    a little bit of ✨ magic ✨) to do what it needs to, and _will never use
    unsafe code_.
-   First class Singletons - or Resources, as we like to call them!
-   Zero dependencies.
-   _And more to come!_

**Please note: Thyseus is in early development and is far from feature-complete.
Pre-1.0.0 releases will not follow Semver and may have frequent breaking
changes.**

## Installation

```sh
pnpm add thyseus
# or
yarn add thyseus
# or
npm i thyseus
```

## Quick API Example:

_This is an "quick & dirty" example to showcase the API - real docs and a better
quickstart guide are in the works!_

To get started, define a component:

```ts
import { Component, Type } from 'thyseus';

class Vec2 extends Component({ x: Type.f32, y: Type.f32 }) {
	addScaled(other: Vec2, scalar: number) {
		this.x += other.x * scalar;
		this.y += other.y * scalar;
	}
}
class Position extends Vec2 {}
class Velocity extends Vec2 {}
```

Let's add a resource to track the time:

```ts
import { Component, Type } from 'thyseus';

class Time extends Component({
	current: Type.f64,
	previous: Type.f64,
	delta: Type.f64,
}) {
	update() {
		this.previous = this.current;
		this.current = Date.now();
		this.delta = (this.current - this.previous) / 1000;
	}
}
```

And then a couple systems:

```ts
import { defineSystem, P, Mut } from 'thyseus';
import Time from './someModule';
import { Position, Velocity } from './someOtherModule';

//prettier-ignore
const time = defineSystem(
	[P.Res(Mut(Time))],
	function updateTime(time) {
		time.previous = time.current;
		time.current = Date.now();
		time.delta = (time.current - time.previous) / 1000;
	}
);
const mover = defineSystem(
	[P.Query([Mut(Position), Velocity]), P.Res(Time)],
	function move(query, time) {
		for (const [pos, vel] of query) {
			pos.addScaled(vel, time.delta);
		}
	},
);
```

Sweet! Now let's make a world with these systems and get it started.

```ts
import World from 'thyseus';

// Note that the .build() method returns a promise.
// We think top-level await is the nicest way to handle this,
// but it's not a requirement.
//prettier-ignore
export default await World.new()
	.addSystem(time)
	.addSystem(mover)
	.build();
```

And then run it!

```ts
import myWorld from './worldModule';

function loop() {
	myWorld.update(); // This also returns a promise!
	requestAnimationFrame(loop);
}
loop();
```

And if you'd like to run your system on two (or more) threads:

```ts
export default await World.new({ threads: 2 }, import.meta.url)
	.addSystem(...)
	...
```

## Caveats

Multithreading with thyseus currently makes use of Atomics.waitAsync (Chrome
only) and module workers (not yet implemented in Firefox). We're investigating
alternatives and closely monitoring browser implementation progress.
