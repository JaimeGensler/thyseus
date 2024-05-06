# @thyseus/math

A math package for use with [Thyseus](https://thyseus.dev) - or for general use
if you need your math primitives as classes.

This package is essentially a class reimplementation of
[`gl-matrix`](https://glmatrix.net/); all credit to
[toji](https://github.com/toji) and `gl-matrix` maintainers.

## Installation

```sh
pnpm add @thyseus/math
```

## Principles

-   `this` is mutable; arguments are immutable.
    -   Methods never mutate passed arguments, only `this`!
-   No hidden object creation.
    -   Methods other than `clone()` never create objects.
-   Fully tree-shakeable.
    -   While some methods assume certain types as arguments, there are no
        internal dependencies so you only pay for what you use.

## API

### Classes

-   `Mat4`
-   `Quat`
-   `Vec2`
-   `Vec3`
-   `Vec4`

### Functions

-   `clamp(min: number, value: number, max: number): number`
-   `degreesToRadians(degrees: number): number`
-   `radiansToDegrees(radians: number): number`

### Constants

-   `HALF_PI`
-   `PI`
-   `TAU`
-   `ORIGIN`
-   `EPSILON`
-   `NORTH` / `SOUTH` / `EAST` / `WEST` / `UP` / `DOWN`
