# Custom System Parameters

Thyseus' system parameter descriptors are designed so that it is simple to write
your own. Nearly all logic surrounding parameter descriptors is contained within
the descriptors themselves rather than within the world, so just about anything
Thyseus can do internally, you can do, too!

## What Is A Descriptor?

As far as Thyseus is concerned, a descriptor is simply an object that contains
the following four methods:

-   `isLocalToThread(): boolean`
-   `intersectsWith(other: object): boolean`
-   `onAddSystem(builder: WorldBuilder): void`
-   `intoArgument(world: World): any`

We'll dive into each of these methods and what they should do before getting
into how to write our own descriptors.

### `isLocalToThread(): boolean`

This determines whether this parameter may only be accessed from the main
thread. Descriptors should return true if the parameter is only available from
the main thread (and therefore requires its system to run on the main thread),
or if the parameter is available on any thread (and its system will run on any
thread). For this method, most descriptors either always return true or always
return false, but `ResourceDescriptor`s, for example, return whether the
supplied class is a `Struct` or not.

### `intersectsWith(other: object): boolean`

This method is called with other parameter descriptors, and is used to determine
if other parameters intersect with or are disjoint with this parameter. If
parameters intersect (`true` is returned), the systems they belong to will be
marked as intersecting, and cannot run in parallel. If they are disjoint
(`false` is returned), it means the systems _can_ run in parallel.

It should be noted that `intersectsWith` **does not** need to be symmetric. Both
descriptors are called with each other, and if either returns true, they are
said to be intersecting. This allows your systems to intersect with both
built-in descriptors and third-party descriptors.

### `onAddSystem(builder: WorldBuilder): void`

This method is called when a system is added by a `WorldBuilder` instance. It is
called with the WorldBuilder that added it, and allows the descriptor to do
whatever it may need with the builder - anything from adding systems or plugins,
to registering components or other data.

### `intoArgument(world: World): any`

The final method needed for a complete parameter descriptor. The world building
the system is passed in and whatever is returned from this method will be passed
to your system. This method may return **anything**!

The return type of `intoArgument` determines the parameter type for your system,
so your parameters can have strong type support!

> System creation is the last step of World construction, so all World
> properties will be set **except systems**.

## Recreating the Resource Parameter Descriptor

Let's dive into the internal implementation of `ResourceDescriptor` to get a
feel for how these methods might work.

### Construction

First, we'll need a factory function that generates our descriptor objects.
Internally, Thyseus implements these as classes, so that's what this example
will use - however, there's no reason you cannot or should not use plain
objects/closures if you prefer.

For our first round of defining resources, we really just need to know the type
(or class) of the resource:

```ts
// We're including this utility type here -
// fundamentally, this is all a class really is.
type Class = {
	new (...args: any[]): object;
};
class ResourceDescriptor {
	resource: Class;
	constructor(resource: Class) {
		this.resource = resource;
	}
}
```

That's a nice start! Let's try adding some descriptor methods.

### Handling Adding To Systems

First, we need to know what the builder should do when it comes across this
descriptor. Resources in Thyseus are a first-class concept, so all we'll need to
do is register that we have a (potentially) new resource!

```ts
class ResourceDescriptor {
	onAddSystem(builder: WorldBuilder) {
		builder.registerResource(this.resource);
	}
}
```

The builder knows what to do from there, so that's it for our responsibilities.
Other descriptors may need to add systems to work correctly, or to register
components, or to define thread message channels!

### Resource Thread Locality

Resources in Thyseus are allowed to be either mainthread-only or shareable
across threads. Thyseus has a single model of shareable data - `Struct`s. If a
class correctly implements the static fields required of `Struct`s, then we
should be able to share it across threads. If not, then we're only going to be
able to access the data from the main thread.

So how do we know a class is a struct? Well, we have an internal utility for
this:

```ts
function isStruct(val: unknown): val is Struct {
	return (
		typeof val === 'function' &&
		typeof val.size === 'number' &&
		typeof val.alignment === 'number' &&
		typeof val.schema === 'number'
	);
}
```

Structs are classes (functions) with static (numeric) `size`, `alignment`, and
`schema` properties.

Okay! Now to use this in our descriptor class:

```ts
class ResourceDescriptor {
	// ...

	isLocalToThread() {
		// Remember - this method asks if the parameter _IS_ local to the thread!
		// If our resource IS a struct, then it is NOT local to the thread
		// If it is NOT a struct, then it IS local to the thread.
		return !isStruct(this.resource);
	}
}
```

### Parameter Intersection

Now we've made it to a trickier concept - parameter intersection. We need to
know if parameters intersect to determine whether systems may run in parallel.
In general, it is safe for two (or more) systems to read the same data at the
same time. However, if a system _writes_ data, it is no longer safe for a
different system to read or write that data.

But wait - we don't even know if we're reading or writing data! We'll need to
revise our constructor a little bit to make sure we know what we're doing with
the data we access.

There's a number of approaches we could take here. One would be to accept a
second argument, perhaps a boolean indicating whether our data should be
readonly or not. Another would be to split our descriptor into two, perhaps a
`ResourceDescriptor` and `MutableResourceDescriptor`. Either of these would be a
perfectly valid approach - however, Thyseus already includes a `Mut<T>` utility
for queries to denote whether they access a component mutably or not. For the
sake of a consistent API, we'll mirror that for resources. Our new constructor
then might look like this:

```ts
class ResourceDescriptor {
	resource: Class;
	canWrite: boolean;

	constructor(resource: Class | Mut<any>) {
		// Mut is a class, so we can use instanceof
		const isMut = resource instanceof Mut;
		// Mut instances just have a value property, containing the wrapped class.
		this.resource = isMut ? resource.value : resource;
		this.canWrite = isMut;
	}
}
```

Great! Now we know if we're reading or writing data.

For `intersectsWith`, we really don't know anything about the values we'll
receive. It could be a first-party parameter descriptor, or a different third
party descriptor. Internally, we generally choose to treat these as `unknown`,
but since they'll always be descriptors, you could type them as `object` (or
even a slightly more narrow `Descriptor` type).

So, first we need to know if the other descriptor is a resource descriptor. If
it isn't, there's no risk of intersection - or strictly speaking, we will place
the responsibility of determining this intersection on the other descriptor.
Next, we only run the risk of intersection if we're accessing the same data. And
last, we only intersect if either this descriptor or the other is accessing data
mutably. In code:

```ts
class ResourceDescriptor {
	intersectsWith(other: unknown) {
		if (!(other instanceof ResourceDescriptor)) {
			// No intersection if it's not a resource.
			return false;
		}
		if (this.resource !== other.resource) {
			// Also no intersection if we're not accessing the same resource.
			return false;
		}
		if (!this.canWrite && !other.canWrite) {
			// No intersection if neither needs to write data!
			return false;
		}
		// One of us writes data the other needs to read/write.
		// That's an intersection!
		return true;
	}
}
```

Remember that `intersectsWith` does not need to be symmetric. _Both descriptors_
will call this method with the other, and if _either_ returns true, then the
parameters intersect. For example, the `WorldDescriptor` implements this method
like so:

```ts
class WorldDescriptor {
	intersectsWith(other: unknown) {
		return true;
	}
}
```

Because we trust that `WorldDescriptor` correctly implements its own
`intersectsWith` method (it always intersects), `ResourceDescriptor` doesn't
need to concern itself with how it interacts with `WorldDescriptor` or any other
descriptor.

### Turning Parameters Into Arguments

The last step is turning your parameter descriptor into an argument. For this,
we receive the world as an argument, and will usually return some piece of its
internal state. In the case of resources, it's pretty easy to get that data!

```ts
class ResourceDescriptor {
	intoArgument(world: World) {
		// Resources is a Map<Class, object>
		// where object is an instance of the class key

		// In the case of mainthread-only resources,
		// this will be only be called on the main thread
		return world.resources.get(this.resource);
	}
}
```

And that's it for functionality. But if you try using this new descriptor in a
system, you may notice some... less than ideal type support.

<!-- prettier-ignore -->
```ts
class ResourceDescriptor { /* All our code in here! */ }

class SomeResource {}

defineSystem(
	() => new ResourceDescriptor(SomeResource),
	// Uh oh! someResource isn't a very useful type at all!
	function aSystem(someResource) {},
);
```

Our parameter isn't narrowed to be an instance of `SomeResource`, nor do we see
that it's readonly. To fix this, we'll need to make our class generic.

<!-- prettier-ignore -->
```ts
class ResourceDescriptor<T extends Class | Mut<Class>> {
	resource: Class;
	canWrite: boolean;

	constructor(resource: T) {/* No changes needed internally */}

	// ...

	intoArgument(
		world: World,
		// Mut<T> is auto-unwrapped to be an instance type
		// Unfortunately, we need to renarrow T in the second case
	): T extends Mut<infer X>
		? X
		: Readonly<InstanceType<T extends Class ? T : never>> 
	{
		return world.resources.get(this.resource);
	}
}
```

And perfect - our `someResource` parameter above should be correctly inferred as
`Readonly<SomeResource>`! You now have a fully functioning custom system
parameter.

### Final Code

```ts
class ResourceDescriptor<T extends Class | Mut<Class>> {
	resource: Class;
	canWrite: boolean;

	constructor(resource: T) {
		const isMut = resource instanceof Mut;
		this.resource = isMut ? resource.value : resource;
		this.canWrite = isMut;
	}

	onAddSystem(builder: WorldBuilder) {
		builder.registerResource(this.resource);
	}

	isLocalToThread() {
		return !isStruct(this.resource);
	}

	intersectsWith(other: unknown) {
		if (!(other instanceof ResourceDescriptor)) {
			return false;
		}
		if (this.resource !== other.resource) {
			return false;
		}
		if (!this.canWrite && !other.canWrite) {
			return false;
		}
		return true;
	}

	intoArgument(
		world: World,
	): T extends Mut<infer X>
		? X
		: Readonly<InstanceType<T extends Class ? T : never>> {
		return world.resources.get(this.resource);
	}
}
```
