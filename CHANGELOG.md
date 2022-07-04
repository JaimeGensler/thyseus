# Changelog

## v0.2.0

### External:

-   `defineSystem()` no longer adds a property to the provided function, and
    returns an object instead.
-   Resources can now also be made threadable by implementing the Thread
    Send/Receive protocol. Classes that implement the static
    `[Thread.Receive]() {}` and instance `[Thread.Send]() {}` methods will be
    considered threadable.

### Internal changes:

-   Remove `recognizesDescriptor()` on Parameters, find parameter matches by
    `type` field.
-   Rename `ShareableClass`, `ShareableInstance`, etc. to `SendableClass`,
    `SendableInstance` for clarity.
-   Class types now extend the class interface

## v0.1.0

-   Initial functionality.
