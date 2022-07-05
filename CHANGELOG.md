# Changelog

## v0.2.0 (TBD)

### 💥 Breaking Changes

-   `defineSystem()` now returns an object rather adding a `parameters` property
    to the provided function. This allows the same function to be re-used for
    multiple systems and (may) make parameter descriptors more easily GC-able in
    the future.

### ✨ Features

-   Resources can now also be made thread-friendly by implementing the Thread
    Send/Receive protocol (i.e., classes that implement
    `static [Thread.Receive]() {}` and `[Thread.Send]() {}` methods).
    -   This should be the preferred method of defining resources for more
        advanced users.
-   Resources that are bound to the main thread for initialization, but are
    readable and/or writeable from multiple threads (for example, a `Keyboard`
    resource that needs to register listeners for `keydown`/`keyup` events) can
    implement a static `create()` method that will be used rather than its
    constructor. This method receives the same arguments its constructor would
    be called with (nothing for resources implementing Thread protocol, a store
    & index for Component resources), and must return an instance of the class.

## v0.1.0 (July 2, 2022)

-   Initial release.
