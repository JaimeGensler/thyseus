# thyseus

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
