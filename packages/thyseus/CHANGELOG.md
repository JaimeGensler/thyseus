# Thyseus Changelog

## 0.15.0

### Minor Changes

-   Removed `eventReaders` from World
-   Removed `eventWriters` from World
-   Removed `registerEvent()` on Worldbuilder
-   Added `register()` to WorldBuilder
-   `async initialize()` on resources will no longer be called
-   Added `And` filter
-   Query Filters no longer accept tuples as arguments; must use explicit `And`
    instead
-   `Or`, `And`, `With`, `Without` may accept up to four generic arguments.

### Patch Changes

-   Fixed bug preventing struct resources initializers from working correctly

## 0.14.0

### Minor Changes

-   Modify EventWriter.prototype.create() signature to be identical to
    EventWriter.prototype.createFrom(); remove
    EventWriter.prototype.createFrom()
-   Change @struct to a no-op
-   Differentiate AddComponent and AddComponentType commands
-   Remove Query.prototype.forEach
-   Remove @struct fields
-   Remove initStruct
-   Expose numeric types
-   Add Entity.prototype.is
-   Default isMainThread to true if only one thread is used
-   Expose serialize/deserialize/drop string/array
-   Remove dropStruct
