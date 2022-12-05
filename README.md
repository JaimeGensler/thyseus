# Thyseus

[![npm version](https://img.shields.io/npm/v/thyseus.svg?style=flat)](https://www.npmjs.com/package/thyseus)
[![license: mit](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![pull requests: welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/JaimeGensler/thyseus/pulls)
[![code style: prettier](https://img.shields.io/badge/code%20style-prettier-ff69b4)](https://github.com/prettier/prettier)

Thyseus is a multi-threadable, DX-focused, and highly performant
[archetypal](https://github.com/SanderMertens/ecs-faq#archetypes-aka-dense-ecs-or-table-based-ecs)
[Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system)
([ECS](https://github.com/SanderMertens/ecs-faq)) written in Typescript. It
provides a simple, expressive, and type-driven API, and includes many features
out of the box, including:

-   Hassle-free multithreading. Don't worry about scheduling, Mutexes, or
    workers - just write your systems and let Thyseus take care of the rest.
-   A **safety-first** approach! No `eval`, `new Function()`, or creating
    workers from blobs - Thyseus leverages recent additions to the language and
    a little bit of ✨ magic ✨ to do what it needs to, and **_will never use
    unsafe code_**.
-   Archetypal storage for lean memory use and cache-friendly iteration.
-   First-class Resources (i.e., singletons).
-   Zero dependencies.

**Please note: Thyseus is in early development and is not yet feature-complete
or nearly as performant as it could be. Pre-1.0.0 releases may have frequent
breaking changes.**

## Installation

```sh
pnpm add thyseus
# or
yarn add thyseus
# or
npm i thyseus
```

## Documentation

Documentation is currently a work on progress, and is being written in no
particular order. Checkout the [docs](./docs/) section to see if your questions
are answered there, or feel free to
[open an issue](https://github.com/JaimeGensler/thyseus/issues/new) if you'd
like to see something in particular sooner!

As always, if you'd like to read about new features, the
[changelog](./CHANGELOG.md) is kept up-to-date.

## Contributing

If you're interested in contributing, please have a look at the
[code of conduct](./CODE_OF_CONDUCT.md) and the
[contributing guide](./CONTRIBUTING.md) first.

## Quick API Example:

To get started, define a component:

```ts
import { struct } from 'thyseus';

@struct()
class Vec2 {
	@struct.f64() declare x: number;
	@struct.f64() declare y: number;

	add(other: Vec2) {
		this.x += other.x;
		this.y += other.y;
	}

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
import { struct } from 'thyseus';

@struct()
class Time {
	@struct.f64() declare current: number;
	@struct.f64() declare previous: number;
	@struct.f64() declare delta: number;
}
```

And then a couple systems:

<!-- prettier-ignore -->
```ts
import { defineSystem } from 'thyseus';
import { Time, Position, Velocity } from './someModule';

const updateTime = defineSystem(
	({ Res, Mut }) => [Res(Mut(Time))],
	function updateTimeSystem(time) {
		time.previous = time.current;
		time.current = Date.now();
		time.delta = (time.current - time.previous) / 1000;
	}
);
const mover = defineSystem(
	({ Query, Mut, Res }) => [Query([Mut(Position), Velocity]), Res(Time)],
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
import { World } from 'thyseus';

// Note that the .build() method returns a promise.
// Top-level await is a convenient way to handle this,
// but it's not a requirement.
export const myWorld = await World.new()
	.addSystem(updateTime)
	.addSystem(mover)
	.build();
```

And then run it!

```ts
import { myWorld } from './someOtherModule';

async function loop() {
	await myWorld.update(); // This also returns a promise!
	requestAnimationFrame(loop);
}
loop();
```

If you'd like to run your systems on multiple threads:

```ts
// Will spawn one worker thread (default threads count is 1 - no worker threads)
export const myWorld = await World.new({ threads: 2 }, import.meta.url)
	.addSystem(...)
	...
```

A full explanation of the few caveats for multithreading will be provided when
documentation is completed. Multithreading relies on
[`SharedArrayBuffer`](https://caniuse.com/sharedarraybuffer) and
[module workers](https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)
(not yet implemented in Firefox).
