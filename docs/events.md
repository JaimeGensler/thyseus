# Events

Events are one way of running logic under certain circumstances or in response
to something happening in your game. They can also be especially useful for
modeling cross-system communication.

In Thyseus, Events are instances of `Struct`s that live in a queue of events of
the same type. New events can be pushed to the queue with `EventWriter<T>`;
events in the queue can be read with `EventReader<T>`.

Events in the queue have no set lifetime - they will persist until the queue is
manually cleared. Both readers and writers can call the `clear()` method to
queue a command that will empty the event queue the next time commands are
processed.

> `EventReader`s and `EventWriter`s only clear their own queue, not queues of
> other event types.

## EventReaders

`EventReader`s are responsible for reading data from the event queue.

They can be iterated over in a `for...of` loop, and will yield instances of the
event type (`Readonly<T>`). You can also check their `length` to determine the
number of elements in the queue.

```ts
import { defineSystem, struct } from 'thyseus';

@struct
class LevelUpEvent {
	@struct.u32 declare level: number;
}

const mySystem = defineSystem(
	({ EventReader }) => [EventReader(LevelUpEvent)],
	function mySystem(levelUpEvents) {
		if (levelUpEvents.length === 0) {
			return;
		}
		for (const luEvent of levelUpEvents) {
			luEvent.level;
		}

		levelUpEvents.clear();
	},
);
```

> Beware! Readers yield the **same object** for every iteration of the
> `for...of` loop, with different backing data.

## EventWriters

`EventWriter`s are responsible for adding events to the queue. There are three
provided methods of doing so:

1. `createDefault(): void` adds an element to the queue with the default data
   for that struct.
2. `create(): T` adds an element to the queue and returns a handle to that
   element for you to mutate.
3. `createFrom(instance: T): void` copies the data from passed instance of the
   struct into the queue.

Because `EventWriter`s gain exclusive access over the event queue, they also
have a `clearImmediate()` method that immediately clears all events in the
queue.

```ts
import { defineSystem, struct } from 'thyseus';

@struct
class LevelUpEvent {}

const mySystem = defineSystem(
	({ EventWriter }) => [EventWriter(LevelUpEvent)],
	function mySystem(levelUpEvents) {
		levelUpEvents.createDefault();
		console.log(levelUpEvents.length); // -> 1

		// A clear command has been queued, but events still exist.
		levelUpEvents.clear();
		console.log(levelUpEvents.length); // -> 1

		// Now, we're removing them immediately.
		levelUpEvents.clearImmediate();
		console.log(levelUpEvents.length); // -> 0
	},
);
```

> `EventWriter` extends `EventReader`, and so has all functionality from above.

## Parallelism

As one may expect, `EventWriter`s require exclusive access to queues, and so
intersect with readers and writers of the same queue. `EventReader`s do _not_
require exclusive access, and so can run in parallel with other readers of the
same queue.
