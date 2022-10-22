# Thyseus

[![npm version](https://img.shields.io/npm/v/thyseus.svg?style=flat)](https://www.npmjs.com/package/thyseus)
[![license: mit](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![pull requests: welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/JaimeGensler/thyseus/pulls)
[![code style: prettier](https://img.shields.io/badge/code%20style-prettier-ff69b4)](https://github.com/prettier/prettier)

Thyseus is a multi-threadable, DX-focused, and highly performant
[archetypal](https://github.com/SanderMertens/ecs-faq#archetypes-aka-dense-ecs-or-table-based-ecs)
[Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system)
([ECS](https://github.com/SanderMertens/ecs-faq)) written in Typescript. It
provides a simple, expressive, and type-safe API, and includes many features out
of the box, including:

-   Hassle-free multithreading. Don't worry about scheduling, Mutexes, or
    workers - just write your systems and let Thyseus take care of the rest.
-   A **safety-first** approach! No `eval`, `new Function()`, or creating
    workers from blobs - Thyseus leverages recent additions to the language and
    a little bit of ✨ magic ✨ to do what it needs to, and **_will never use
    unsafe code_**.
-   Archetypal storage for lean memory consumption and cache-friendly iteration.
-   First-class Resources (i.e., singletons).
-   Zero dependencies.

**Please note: Thyseus is in early development and is not yet feature-complete.
Pre-1.0.0 releases may have frequent breaking changes.**

## Installation

```sh
pnpm add thyseus
# or
yarn add thyseus
# or
npm i thyseus
```

## Contributing

If you're interested in contributing, please have a look at the
[code of conduct](./CODE_OF_CONDUCT.md) and the
[contributing guide](./CONTRIBUTING.md) first.

## Quick API Example:

_This is a quick example to showcase the API - real docs and a better quickstart
guide are in the works! For now, if you'd like to read about features, the
[changelog](./CHANGELOG.md) is kept up-to-date and is probably the best place to
find them._

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
import { Resource, Type } from 'thyseus';

class Time extends Resource({
	current: Type.f64,
	previous: Type.f64,
	delta: Type.f64,
}) {}
```

And then a couple systems:

<!-- prettier-ignore -->
```ts
import { defineSystem, P, Mut } from 'thyseus';
import Time from './someModule';
import { Position, Velocity } from './someOtherModule';

const updateTime = defineSystem(
	[P.Res(Mut(Time))],
	function updateTimeSystem(time) {
		time.previous = time.current;
		time.current = Date.now();
		time.delta = (time.current - time.previous) / 1000;
	}
);
const mover = defineSystem(
	[P.Query([Mut(Position), Velocity]), P.Res(Time)],
	function moverSystem(query, time) {
		for (const [pos, vel] of query) {
			pos.addScaled(vel, time.delta);
		}
	},
);
```

Sweet! Now let's make a world with these systems and get it started.

<!-- prettier-ignore -->
```ts
import World from 'thyseus';

// Note that the .build() method returns a promise.
// Top-level await is a convenient way to handle this,
// but it's not a requirement.
export default await World.new()
	.addSystem(updateTime)
	.addSystem(mover)
	.build();
```

And then run it!

```ts
import myWorld from './someOtherModule';

async function loop() {
	await myWorld.update(); // This also returns a promise!
	requestAnimationFrame(loop);
}
loop();
```

If you'd like to run your systems on multiple threads:

```ts
// Will use 2 threads (main thread and one worker)
export default await World.new({ threads: 2 }, import.meta.url)
	.addSystem(...)
	...
```

### Notes on Multithreading

Full documentation and caveats for multithreading will be provided when
documentation is completed. Currently, multithreading makes use of
`SharedArrayBuffer`, module workers (not yet implemented in Firefox), and
`Atomics.waitAsync` (Chrome only, alternatives being investigated).
