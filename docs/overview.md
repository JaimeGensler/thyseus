# What is an Entity Component System framework?

"Entity Component System", or ECS, is a data-oriented approach to writing code,
usually for game development, that’s centered around modularity and reusability.
It consists of three core concepts:

-   **Entities** - unique things in your game world. An entity can represent the
    player, an enemy, a part of the scenery, the level itself, a piece of UI, or
    pretty much anything else.
-   **Components** - "plain" data. Components represent data that belong to
    entities. An entity can have 0 or more components, and can add or remove
    components throughout the course of its life.
-   **Systems** - the functionality of your game. Systems operate on the data in
    your ECS world, reading and writing data as needed to achieve a specific
    task. Systems usually work by querying for entities with a specific set of
    components and applying mutations. For example, a "move" system might
    operate on all entities that have the `Position` and `Velocity` components.

Inspired by [bevy](https://bevyengine.org/), Thyseus also adds the concept of

-   **Resources** - world-unique data. Resources may be used to keep track of
    time (e.g. time since the last frame, the current frame number, or time
    elapsed since start), an asset or set of assets, or a renderer.

In Thyseus, entities are (more or less) unique ids, components and resources are
instances of classes, and systems are functions.
