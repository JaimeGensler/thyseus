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

Thyseus is a DX & performance oriented
[archetypal](https://github.com/SanderMertens/ecs-faq#archetypes-aka-dense-ecs-or-table-based-ecs)
[Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system)
([ECS](https://github.com/SanderMertens/ecs-faq)) for Typescript. It provides an
expressive, type-driven API and includes many features out of the box,
including:

-   Effortless integration with third-party libraries like
    [three.js](https://github.com/mrdoob/three.js/).
-   Boilerplate-free and safety-first multithreading - no `eval()`!
-   Archetypal storage for lean memory use and cache-friendly iteration.
-   Complex queries with filters like `And`, `Or`, `With`, and `Without`.
-   First class support for Resources (singletons) and Events.
-   Deeply customizable execution logic for easy handling of patterns like fixed
    updates.
-   Effortless integration with third-party libraries.

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
import { Query, Position, Velocity } from './components';

export function spawnEntitiesSystem(commands: Commands) {
  commands.spawn().add(new Position()).add(new Velocity(1, 2));
}

export function moveSystem(query: Query<[Position, Velocity]>) {
  for (const [pos, vel] of query) {
    pos.add(vel);
  }
}
```

### Worlds

<!-- prettier-ignore -->
```ts
import { World, Schedule } from 'thyseus';
import { moveSystem, spawnEntitiesSystem } from './systems';
import { StartupSchedule } from './schedules'

class SetupSchedule extends Schedule {}
export const myWorld = await new World()
  .addSystems(SetupSchedule, spawnEntitiesSystem)
  .addSystems(Schedule, moveSystem)
  .prepare();

myWorld.start();
```
