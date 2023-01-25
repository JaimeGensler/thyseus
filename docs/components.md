# Components

As mentioned in the overview, components are data that belong to an entity. An
entity can have 0 or more components and can add or remove components throughout
the course of its life.

In general, components are intended to be relatively granular and
self-contained. For example, while a typical OOP approach may have a `Player`
class that owns all data related to the player (such as health, inventory,
position in the world, and likely more). The data-oriented approach would be to
simply have an `IsPlayer` class to tag the Player entity, and to have separate
components for `Health`, `Inventory`, `Transform`, that are added to that
entity. If another entity needs to have health or an inventory, it's as simple
as adding a component - all other functionality should follow!

## Writing A Component

In Thyseus, components are decorated classes:

```ts
import { struct } from 'thyseus';

@struct()
class Health {
	@struct.u16() declare max: number;
	@struct.u16() declare current: number;

	heal(amount: number) {
		// Clamp to max!
		this.current = Math.min(this.max, this.current + amount);
	}

	takeDamage(amount: number): boolean {
		// Clamp to 0 to prevent integer underflow
		this.current = Math.max(0, this.current - ammount);
		// Return boolean indicating if this died!
		return this.current === 0;
	}
}

// If you were iterating Entities with a health component:
let health: Health;
console.log(`${health.current}/${health.max}`);
health.current = 3;
console.log(health.current); // 3
```

We can use the `@struct()` decorator to denote that the `Health` class is what
Thyseus refers to a "struct." **Any class decorated with `struct` can be used as
a component!** Any properties on that struct **_must_** be decorated as well
with the type of that property. Like any other class, your components may or may
not contain methods.

> NOTE: Thyseus cannot see non-decorated properties! If you declare a property
> on your class without a decorator, you will not have consistent, predictable
> behavior!

Thyseus also allows more fine-grained control of your numeric types. While
Javascript numbers are (or must behave as)
[double precision 64-bit floating point numbers](https://en.wikipedia.org/wiki/Double-precision_floating-point_format),
Thyseus requires you declare more specifically what sort of number a property
is. The primitive types are all properties of `@struct`, and are listed below:

| **Name** | **Description**              | **Size (bytes)** | **JS Type** |
| -------- | ---------------------------- | ---------------- | ----------- |
| u8       | Unsigned 8-bit integer       | 1                | number      |
| u16      | Unsigned 16-bit integer      | 2                | number      |
| u32      | Unsigned 32-bit integer      | 4                | number      |
| u64      | Unsigned 64-bit integer      | 8                | bigint      |
| i8       | Signed 8-bit integer         | 1                | number      |
| i16      | Signed 16-bit integer        | 2                | number      |
| i32      | Signed 32-bit integer        | 4                | number      |
| i64      | Signed 64-bit integer        | 8                | bigint      |
| f32      | 32-bit Floating Point number | 4                | number      |
| f64      | 64-bit Floating Point number | 8                | number      |
| bool     | Boolean (`true`/`false`)     | 1                | boolean     |

If you're coming from a typical JS background and are not used to working with
multiple numeric types, don't worry; `@struct.f64()` works like the numbers
you're used to, and is a fine choice! It just may not always be the best fit for
the job.

You can also use the class constructors for structs, provided you pass `this` to
the `initStruct` function first (similar to calling `super()` in subclasses):

```ts
import { struct, initStruct } from 'thyseus';

@struct()
class Health {
	@struct.u16() declare max: number;
	@struct.u16() declare current: number;

	constructor(max = 100, current = max) {
		initStruct(this);

		this.max = max;
		this.current = current;
	}

	// ...
}
```

For instances to work, you **must** pass them to `initStruct` _before_ accessing
fields, and constructors must not have any required arguments. You can use this
feature to set default values of components when adding them to entities - for
example, in the above case, if you add the `Health` component to an entity
without specifying a `current` and `max` value, both will be set to 100.

You've likely noticed at this point that we haven't listed non-primitive types
like arrays. Don't fret - we've got you covered!

## Non-primitive fields

Thyseus allows you to use more complex types, with the caveat that they must be
statically sized. For example, if you need to use arrays, you have to declare
upfront the size of that array, as well as the types of the elements that array
contains. Currently, there are three decorators for complex types.

### `@struct.string()`

```ts
@struct()
class MyStruct {
	@struct.string({ characterCount: 4 }) declare str: string;

	@struct.string({ byteLength: 12 }) declare str2: string;
}
```

The `@struct.string()` decorator allows your struct to contain strings. The
decorator accepts an options object containing either
`{ characterCount: number }` or `{ byteLength: number }`. If `characterCount` is
set, your string can contain up to the specified number of characters.
`byteLength` is useful if you want more control over the exact allocation size.

Note that unlike typical Javascript strings, `'\u0000'` characters terminate the
string.

### `@struct.array()`

```ts
@struct()
class MyStruct {
	@struct.array({ type: 'u8', length: 4 }) declare arr: Uint8Array;

	@struct.array({ type: 'f32', length: 16 }) declare str2: Float32Array;
}
```

This decorator allows you to specify a typed array as a property. It accepts an
options object containing `{ type: PrimitiveType, length: number}`. Type is one
of the primitive types listed above (`'u8'`, `u16`, etc.) and length is the
number of elements the array contains.

### `@struct.substruct()`

```ts
@struct()
class RGB {
	@struct.u8() declare r: number;
	@struct.u8() declare g: number;
	@struct.u8() declare b: number;
}

@struct()
class RGBA {
	@struct.substruct(RGB) declare rgb: RGB;
	@struct.u8() declare a: number;
}
```

This decorator allows you to nest structs within structs. It accepts a struct
class to be a member of a struct, and will return an instance of that struct.

## Extending Structs

For the most part, structs will work just like any other Javascript class.
**However, there is one caveat when extending structs: you may safely extend a
component _only so long as you do not add additional fields_**. If you'd like to
extend a component with new fields, you'll need to instead use the
`@struct.substruct` decorator.

Bad (will not work as expected):

```ts
@struct()
class Vec2 {
	@struct.f64() declare x: number;
	@struct.f64() declare y: number;
}

@struct()
class Vec3 extends Vec2 {
	// We cannot extend structs with new fields!
	@struct.f64() declare z: number;
}
```

Good:

```ts
@struct()
class Vec2 {
	@struct.f64() declare x: number;
	@struct.f64() declare y: number;
}

class Vec3 {
	@struct.substruct(Vec2) declare vec2: Vec2;
	@struct.f64 declare z: number;

	get x() {
		return this.vec2.x;
	}
	set x(value: number) {
		this.vec2.x = value;
	}
	get x() {
		return this.vec2.y;
	}
	set x(value: number) {
		this.vec2.y = value;
	}
}
```

Also good:

```ts
import { struct } from 'thyseus';

@struct()
class Vec3 {
	@struct.f64() declare x: number;
	@struct.f64() declare y: number;
	@struct.f64() declare z: number;
}

// These don't add additional fields, and so work totally fine!
class Position extends Vec3 {}
class Velocity extends Vec3 {}
```

## Zero-Sized Types (ZSTs)

In some cases, you may want to add a special "tag" to entities for use in
queries (e.g., `IsPlayer`), but have no additional data associated with that
component. In these cases, you can use a **zero-sized type**. As the name likely
implies, these are structs that take up no storage space.

```ts
@struct()
class IsPlayer {}
```

You can freely add ZSTs to entities like any other component! The only
difference between a ZST and a "normal" component is that Thyseus will never
construct a ZST to provide you a "handle" on these components, and so they
cannot be queried for directly. But don't worry - they're still perfectly
useable in queries!
