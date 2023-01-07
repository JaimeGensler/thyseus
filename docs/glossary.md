# Glossary

## Struct

In other languages like C and Rust, structs are similar to Javascript objects,
but their keys and the types of their values are known at compile-time and can
be optimized as a result. Structs in Thyseus are intended to emulate these
structs, and so their size must be known ahead of time.

## Resources

World-unique data. Some ECS libraries use singletons to model world-unique data
(components that only exist on one entity). Because this pattern of needing
world-unique data is so common, Thyseus treats it as a first-class concept.
Resources in Thyseus are just classes - if they correctly implement the
requirements of `Struct`s, they can be shared across threads.

## System Relationships

In a multithreaded environment, systems can have one of two relationships to one
another - `Disjoint` or `Intersecting`. When two systems are `Disjoint`, it
means that neither system will write data that the other is trying to read or
write. Systems that read (and only read) the same data remain disjoint. Disjoint
systems may execute in parallel. `Intersecting` systems are the opposite of
`Disjoint` systems - one (or both) of the systems writes to data that the other
system must also read or write. Intersecting systems cannot execute in parallel.

In general, you don’t have to think about whether systems are disjoint or
intersecting - Thyseus can automatically determine the relationship between
every system in your world. However, it is important to make sure you’re only
requesting write access when your system needs it, or in certain cases to break
a system into multiple smaller systems if it requires mutable access to a lot of
different data. The page on
[using multiple threads](./multithreading/using_multiple_threads.md) goes into
detail about getting better multithreaded performance, and the guide to
[custom system parameters](./advanced_patterns/custom_system_parameters.md)
explains more how intersection is determined.

## Dependencies

Dependencies are requirements that must be met before a system can run. A system
can specify that certain systems must before it may run as well.

## ZST

Zero-sized type. This refers to structs that are used as markers (or tags, or
flags) for entities, and whose storage does not take up any space.

## Archetype (Table)

There are a few different approaches to writing an ECS - Thyseus uses an
[archetypal](https://github.com/SanderMertens/ecs-faq#archetypes-aka-dense-ecs-or-table-based-ecs)
design. An entity's **Archetype** is the collection of component types it has;
entities with the same archetype are stored together. This storage strategy uses
**"tables"** (similar to a relational database), where rows are entities and
columns are data for a specific component. In this way, data for an entity's
component can be found via the row and column. In general, we use the term
"Archetype" when refering to entity identity, and "Table" when referring to data
or an entity's "location".

This strategy generally makes iterating over entities extremely cache-friendly
at the cost of changing an entity's archetype (adding/removing components) - a
**table move** - a bit more expensive.
