<h1>
	<a href="https://thyseus.dev" target="_blank">
		<picture>
			<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/JaimeGensler/thyseus/main/.github/logo-dark.svg">
			<source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/JaimeGensler/thyseus/main/.github/logo-light.svg">
			<img alt="Thyseus" src="https://raw.githubusercontent.com/JaimeGensler/thyseus/main/.github/logo-light.svg" style="max-width: 100%;">
		</picture>
	</a>
</h1>

[![npm version](https://img.shields.io/npm/v/thyseus.svg?style=flat)](https://www.npmjs.com/package/thyseus)
[![license: mit](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![pull requests: welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/JaimeGensler/thyseus/pulls)
[![code style: prettier](https://img.shields.io/badge/code%20style-prettier-ff69b4)](https://github.com/prettier/prettier)

Thyseus is a DX-focused and highly performant
[archetypal](https://github.com/SanderMertens/ecs-faq#archetypes-aka-dense-ecs-or-table-based-ecs)
[Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system)
([ECS](https://github.com/SanderMertens/ecs-faq)) for Typescript. It provides an
expressive, type-driven API and includes many features out of the box,
including:

-   Hassle-free multithreading. Don't worry about scheduling, Mutexes, or
    workers - just write your systems and let Thyseus take care of the rest.
-   A **safety-first** approach. No `eval`, `new Function()`, or creating
    workers from blobs - Thyseus leverages recent additions to the language and
    a little bit of ✨ magic ✨ to do what it needs to, and **_will never use
    unsafe code_**.
-   Archetypal storage for lean memory use and cache-friendly iteration.
-   Complex queries with `Optional`, `With`, `Without`, `And`, and `Or` filters.
-   Deeply customizable execution logic for easy handling of patterns like fixed
    updates.

Get started with [the docs](https://thyseus.dev/docs), or join us on the
[Web-ECS Discord](https://discord.gg/T3g8U89qqZ)!

## Installation

```sh
# pnpm
pnpm add thyseus

# yarn
yarn add thyseus

# npm
npm i thyseus
```

## Contributing

If you're interested in contributing, please have a look at the
[code of conduct](./CODE_OF_CONDUCT.md) and the
[contributing guide](./CONTRIBUTING.md) first.

## API

### Components

<!-- prettier-ignore -->
```ts
import { struct } from 'thyseus';

@struct
class Vec2 {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(other: Vec2) {
    this.x += other.x;
    this.y += other.y;
  }
}
export class Position extends Vec2 {}
export class Velocity extends Vec2 {}
```

### Systems

<!-- prettier-ignore -->
```ts
import { Position, Velocity } from './components';

export function spawnEntitiesSystem(commands: Commands) {
  commands.spawn().addType(Position).add(new Velocity(1, 2));
}

export function moveSystem(query: Query<[Mut<Position>, Velocity]>) {
  for (const [pos, vel] of query) {
    pos.add(vel);
  }
}
```

### Worlds

<!-- prettier-ignore -->
```ts
import { World } from 'thyseus';
import { moveSystem, spawnEntitiesSystem } from './systems';
import { StartupSchedule } from './schedules'

export const myWorld = await World.new()
  .addSystemsToSchedule(StartupSchedule, spawnEntitiesSystem)
  .addSystems(moveSystem)
  .build();

myWorld.start();
```
