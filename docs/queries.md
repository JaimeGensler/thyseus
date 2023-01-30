# Queries

As their name implies, Queries allow you to query for entities that have a
specific collection of components. They're one of the most fundamental building
blocks of any ECS and are the primary way you'll access component data. In
Thyseus, queries are system parameters, so systems can specify as many queries
as they need (including zero) to function.

## Accessing Data

To query for a specific component, simply provide it to the query descriptor
function. Your system will receive a query as an argument that can be iterated
over:

```ts
import { struct, defineSystem } from 'thyseus';

@struct
class MyComponent {
	@struct.f64() declare myValue: number;
}

defineSystem(
	({ Query }) => [Query(MyComponent)],
	function yourSystem(query) {
		for (const myComp of query) {
			console.log(myComp.myValue);
		}
	},
);
```

In the above example, we create a query for entities with the `MyComponent`
component - the query will match all entities with this component. In our
system, we iterate over each of those entities and log the value of the entity's
component. In this example, the yielded `myComp` values will be instances of
`MyComponent`.

> WARNING: You **should not** grab and hold a reference to the component
> instance for use outside of iteration, as Thyseus re-uses component instances
> for performance reasons.

But what if you want to access multiple components in the same query? No
problem, just use a tuple:

```ts
import { struct, defineSystem } from 'thyseus';

@struct
class CompA {
	@struct.f64() declare valueA: number;
}
@struct
class CompB {
	@struct.f64() declare valueB: number;
}

defineSystem(
	({ Query }) => [Query([CompA, CompB])],
	function yourSystem(query) {
		for (const [compA, compB] of query) {
			console.log(compA, compB);
		}
	},
);
```

In this case, the query will yield tuples where the first element is an instance
of `CompA` and the second an instance of `CompB`. You can use an array of any
size to specify the components you need (you cannot nest arrays).

If you're using Typescript, you'll likely have noticed that both `compA` and
`compB` are readonly. **By default, queries only allow you to access component
data readonly.** Of course, data that can only ever be read is of very limited
use to us.

> At the moment, Thyseus does not throw an error if you write data that you've
> requested readonly. In the future, this will likely change to provide better
> guarantees on code correctness. Typescript will help prevent you from making
> these mistakes!

### Writing Data

Mutable component data is as easy as wrapping your components in `Mut`:

```ts
import { struct, defineSystem } from 'thyseus';

@struct
class Vec3 {
	@struct.f64() declare x: number;
	@struct.f64() declare y: number;
	@struct.f64() declare z: number;
}
class Position extends Vec3 {}
class Velocity extends Vec3 {}

defineSystem(
	// We've wrapped Position in Mut!
	({ Query, Mut }) => [Query([Mut(Position), Velocity])],
	function yourSystem(query) {
		// Now position is mutable, but velocity is still readonly.
		for (const [pos, vel] of query) {
			pos.x += vel.x;
			pos.y += vel.y;
			pos.z += vel.z;
		}
	},
);
```

You can wrap as many components as you need in `Mut`. Though it may be tempting
to make everything mutable (_"just in case"_), you should only use it if you
need it. When running systems in parallel, declaring that you _may_ write a
component - **even if you don't** - prevents other systems that read or write
that data from running in parallel, potentially negatively impacting
performance. Alongside the general safety and correctness of readonly, this is
why Thyseus makes components readonly by default.

### Optional Access

For some systems, you may want to access component data if any entity has a
particular component, without impacting matches if it doesn't have that
component. For this, you may use `Optional`. Optional may wrap components (or
Mut components), and will either yield `null` or an instance of that component.

```ts
defineSystem(
	({ Query, Optional, Mut }) => [
		Query([CompA, Optional(CompB), Optional(Mut(CompC))]),
	],
	function yourSystem(query) {
		for (const [a, maybeB, maybeMutableC] of query) {
			// Always do something

			if (maybeB) {
				// Do something conditionally
			}
			if (maybeMutableC) {
				// Do something else conditionally
			}
		}
	},
);
```

## Filters

Queries also allow you to specify that entities must have or _not_ have specific
components without needing access to those components. These are known as
**_Query Filters_**. Filters are the second argument of the `Query()` descriptor
creator, and must always be wrapped in some filter specifier.

### With

As the name implies, this filter requires that entities have a specific
component. If they do not, the query will fail to match. `With` filters are
particularly useful for zero-sized components, which you may use to "tag"
entities.

```ts
defineSystem(
	({ Query, With }) => [Query(A, With(B))],
	function yourSystem(query) {
		// Query iteration is the same as if there was no filter, but it's
		// guaranteed that all matched entities have both A and B
		for (const a of query) {
		}
	},
);
```

You can pass either a single component to `With`, or an array of components if
you want to require multiple (an "And" clause):

```ts
defineSystem(
	// Matched Entities will have A, B, and C
	// This is identical to Query(A, [With(B), With(C)])
	({ Query, With }) => [Query(A, With([B, C]))],
	function yourSystem(query) {},
);
```

### Without

The opposite of With, `Without` requires that queried entities do not have
specific components.

```ts
defineSystem(
	// All matched entities have A, and do NOT have B
	({ Query, Without }) => [Query(A, Without(B))],
	function yourSystem(query) {},
);
```

### Or

`Or` filters allow more complex query logic, where entities may satisfy either
condition provided in order to match a query. `Or` can only accept two
arguments, but you may nest them as deeply as you need. The provided arguments
must be valid filters - `With`, `Without`, `Or`, or some tuple ("And") of those
items.

```ts
defineSystem(
	// All matched entities have A, and have either B or C
	({ Query, Or, With }) => [Query(A, Or(With(B), With(C)))],
	function yourSystem(query) {},
);
```

### Filter simplification and impossible queries

When queries are created, they will look for impossible conditions and remove
them from the list of potential match patterns in a "simplification" process.
After simplification, if there are no potential match patterns, you have created
an impossible query and an error will be thrown. For example:

```ts
defineSystem(
	({ Query, Without }) => [Query(A, [Without(A)])],
	function yourSystem(query) {},
);
```

The above query requires components both to have A and to _not_ have A; this is,
of course, logically impossible. Because there are no other possible ways for
this query to match entities, an error will be thrown when the query is built.

On the other hand, let us consider a slightly more complex query that simplifies
but does not throw:

```ts
defineSystem(
	({ Query, Or, With, Without }) => [
		Query([], [Or(With(A), With(B)), Or(Without(A), Without(B))]),
	],
	function yourSystem(query) {},
);
```

Strictly speaking, there are four possible ways an entity could match this
query:

1. (A && !A) - The entity has **A** and does not have **A**.
2. (A && !B) - The entity has **A** and does not have **B**.
3. (B && !A) - The entity has **B** and does not have **A**.
4. (B && !B) - The entity has **B** and does not have **B**.

Conditions 1 and 4 are impossible and so will be removed, leaving us with two
conditions that are possible. Because there is some way for entities to match
the query, no error will be thrown. In general, it is suggested that you write
queries as clearly as possible so as not to take advantage of simplification,
but this behavior is available if for whatever reason it is the best/only way to
write a query.
