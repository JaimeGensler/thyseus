# Using multiple threads

Now that you know all the rules of multithreading, let's get going with parallel
execution!

## World Config

Provided all the rules are followed, running your systems on multiple threads
with thyseus is as simple as changing configuration.

```ts
const world = await World.new({ threads: 2 }, import.meta.url)
	.addSystem(/* ... */)
	// ...
	.build();
```

> **NOTE:** `{ threads: 1 }` indicates that the world will be singlethreaded.
> This is the default setting. `threads` can never be less than one.

The above configuration will run your systems on two threads - the main thread
and one worker. In general, if you want to maximize performance, you'll want to
use `navigator.hardwareConcurrency`:

```ts
const world = await World.new(
	// navigator.hardwareConcurrency is not available in newer versions of Safari
	{ threads: navigator.hardwareConcurrency ?? 1 },
	import.meta.url,
);
```

Exceeding `navigator.hardwareConcurrency` (assuming it is available) **will
not** result in better performance, and in fact will usually result in _worse_
performance. If you'd prefer to target a specific number of threads without
exceeding `navigator.hardwareConcurrency`, you should clamp the value (e.g.,
`Math.min(navigator.hardwareConcurrency ?? 1, yourTargetThreadCount)`).

> If you're targeting newer versions of Safari and would like to enable
> multithreading, you will need to use some form of
> [user agent sniffing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent)
> or a [polyfill](https://github.com/oftn-oswg/core-estimator) for
> navigator.hardwareConcurrency.

## Wait... that's it?

Yep, that's pretty much it! Using the parameter descriptors of a system, Thyseus
is able to determine what systems can run in workers (as opposed to the main
thread only) as well as what systems can run in parallel. **In other words,
because Thyseus requires you to declare what data you are using and how, it
knows how to parallelize your systems for maximum performance without you
needing to do anything more.**

However, that doesn't mean there's nothing you can do to improve multithreaded
performance. There are a few general guidelines that can help you write more
performant systems:

1.  Only request mutable access if you really need it.

Writing data, whether that's queries or resources, forces a lock on that data
and prevents any other systems from reading or writing it until that system is
finished executing.

2.  Use Query Filters if you don't need access to component data.

As mentioned in the queries section, query filters do not impact whether systems
can run in parallel as they do not actually access any data. If you want to
guarantee the presence of a component, but do not need to read or write data,
you should _always_ use a query filter.

3. Keep your systems small and focused.

In general, the more data a system needs access to - even readonly access - the
more likely it is that that system will not be able to run in parallel with
other systems. If there are more systems that can run in parallel (even if there
are more systems overall), threads will spend less time waiting for data to
become free and more time running your code!

In general, the more granular your data and data access, the better!

## How do I know which thread a system will run on?

The default executor does not generate a single schedule to follow - this is to
prevent systems with longer execution times from preventing overall progress.
Instead, it tries to see if any of the remaining systems are able to run. It
executes the first system it finds if one is available. If there aren't any that
can be run, it waits until another thread has finished executing a system and
tries again. This means that, except for mainthread-only systems, any system can
run on any thread, and can change which thread it executes from frame to frame.

Thyseus also does not have a robust notion of thread identity. That is, a thread
is either the main thread (which has some additional
capabilities/responsibilities), or it's one of the worker threads. There is at
present no way of dedicating one particular thread for one particular type of
task or set of systems.
