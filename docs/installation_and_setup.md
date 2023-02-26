# Installation & Setup

To get started with Thyseus, you'll need to create a new project or add it to an
existing one. If you're starting a new project, we highly recommend using
[Vite](https://vitejs.dev/) as your bundler - in the future, we will likely
release a plugin for Vite that improves performance and DX.

```sh
# pnpm
pnpm add thyseus

# yarn
yarn add thyseus

# npm
npm i thyseus
```

Thyseus also makes use of decorators, and so requires Typescript as well.

> These decorators will be upgraded to the new ES decorators once Typescript 5
> is released, so Typescript 5 will soon be the minimum version.

```sh
# pnpm
pnpm add -D typescript

# yarn
yarn add -D typescript

# npm
npm i -D typescript
```

## Performance & Production Builds

Thyseus uses [`esm-env`](https://github.com/benmccann/esm-env) to determine
whether you're building your app for development or production. Dev builds have
a number of additional correctness checks and validations that help you make
sure your app works correctly and doesn't throw errors (or throws easily
debuggable errors). These checks come at the cost of speed, so for production
builds these checks are stripped out.
