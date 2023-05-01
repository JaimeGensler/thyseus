import "esm-env";
import { m as memory, E as Entity, D as DEV_ASSERT, d as defaultPlugin, C as CoreSchedule, a as dropStruct, b as CLEAR_QUEUE_COMMAND, c as Commands, i as isStruct, e as createManagedStruct } from "./defaultPlugin-6e1eea47.js";
import { f, g, r, s } from "./defaultPlugin-6e1eea47.js";
class Table {
  static createEmptyTable(world) {
    const pointer = world.threads.queue(() => {
      const ptr = memory.alloc(8);
      return memory.views.u32[ptr >> 2] = 4294967295, memory.views.u32[(ptr >> 2) + 1] = 4294967295, ptr;
    });
    return new this(world, [], pointer, 0n, 0);
  }
  static createRecycledTable(world) {
    const pointer = world.threads.queue(() => {
      const capacity = world.config.getNewTableSize(0), ptr = memory.alloc(8);
      return memory.views.u32[ptr >> 2] = 0, memory.views.u32[(ptr >> 2) + 1] = capacity, memory.views.u32[(ptr >> 2) + 2] = memory.alloc(
        capacity * Entity.size
      ), ptr;
    });
    return new this(world, [Entity], pointer, 0n, 1);
  }
  static create(world, components, bitfield, id) {
    const capacity = world.config.getNewTableSize(0), sizedComponents = components.filter(
      (component) => component.size > 0
    ), pointer = memory.alloc(4 * (2 + sizedComponents.length));
    memory.views.u32[(pointer >> 2) + 1] = capacity;
    let i = 2;
    for (const component of sizedComponents)
      memory.views.u32[(pointer >> 2) + i] = memory.alloc(
        component.size * capacity
      ), i++;
    return new this(world, sizedComponents, pointer, bitfield, id);
  }
  #world;
  #components;
  #pointer;
  // [size, capacity, ...componentPointers]
  bitfield;
  #id;
  constructor(world, sizedComponents, pointer, bitfield, id) {
    this.#world = world, this.#components = sizedComponents, this.#pointer = pointer, this.bitfield = bitfield, this.#id = id;
  }
  get pointer() {
    return this.#pointer;
  }
  get id() {
    return this.#id;
  }
  get capacity() {
    return memory.views.u32[(this.#pointer >> 2) + 1];
  }
  get length() {
    return memory.views.u32[this.#pointer >> 2];
  }
  set length(value) {
    memory.views.u32[this.#pointer >> 2] = value;
  }
  getColumn(componentType) {
    return memory.views.u32[(this.#pointer >> 2) + 2 + this.#components.indexOf(componentType)];
  }
  hasColumn(componentType) {
    return this.#components.includes(componentType);
  }
  delete(index) {
    this.length--;
    let i = 2;
    for (const component of this.#components) {
      const ptr = memory.views.u32[(this.#pointer >> 2) + i];
      memory.copy(
        ptr + this.length * component.size,
        // From the last element
        component.size,
        // Copy one component
        ptr + index * component.size
        // To this element
      ), i++;
    }
  }
  move(index, targetTable) {
    targetTable.capacity === targetTable.length && targetTable.grow();
    const { u32, u64 } = memory.views;
    if (this.#components[0] !== Entity)
      return targetTable.length++, BigInt(index);
    const ptr = this.getColumn(Entity), lastEntity = u64[(ptr >> 3) + this.length];
    for (const component of this.#components) {
      const componentPointer = this.getColumn(component) + index * component.size;
      if (targetTable.hasColumn(component))
        memory.copy(
          componentPointer,
          component.size,
          targetTable.getColumn(component) + targetTable.length * component.size
        );
      else
        for (const pointerOffset of component.pointers ?? [])
          memory.free(u32[componentPointer + pointerOffset >> 2]);
    }
    return targetTable.length++, this.delete(index), lastEntity;
  }
  grow() {
    memory.views.u32[(this.#pointer >> 2) + 1] = this.#world.config.getNewTableSize(this.capacity);
    let i = 2;
    for (const component of this.#components)
      memory.reallocAt(
        this.#pointer + (i << 2),
        component.size * this.capacity
      ), i++;
  }
  copyComponentIntoRow(row, componentType, copyFrom) {
    this.hasColumn(componentType) && memory.copy(
      copyFrom,
      componentType.size,
      this.getColumn(componentType) + row * componentType.size
    );
  }
  getColumnPointer(componentType) {
    const componentIndex = this.#components.indexOf(componentType);
    return componentIndex === -1 ? 0 : this.#pointer + 8 + (componentIndex << 2);
  }
  getTableSizePointer() {
    return this.#pointer;
  }
}
const lo32 = 0x00000000ffffffffn, getIndex = (entityId) => Number(entityId & lo32), ENTITY_BATCH_SIZE = 256, ONE_GENERATION = 1n << 32n;
class Entities {
  static fromWorld(world) {
    return new this(
      world,
      world.threads.queue(() => {
        const { u32 } = memory.views, pointer = memory.alloc(4 * 4) >> 2;
        return u32[pointer + 2] = memory.alloc(8 * ENTITY_BATCH_SIZE), u32[pointer + 3] = ENTITY_BATCH_SIZE, pointer;
      })
    );
  }
  #world;
  #pointer;
  // [nextId, cursor, locationsPointer, capacity]
  #recycled;
  constructor(world, pointer) {
    this.#pointer = pointer, this.#world = world, this.#recycled = world.archetypes[1];
  }
  /**
   * A lockfree method to obtain a new Entity ID
   */
  spawn() {
    const { u32, u64 } = memory.views, recycledSize = this.#recycled.length, recycledPtr = this.#recycled.getColumn(Entity);
    for (let currentCursor = this.#getCursor(); currentCursor < recycledSize; currentCursor = this.#getCursor())
      if (this.#tryCursorMove(currentCursor))
        return u64[(recycledPtr >> 3) + currentCursor] + ONE_GENERATION;
    return BigInt(Atomics.add(u32, this.#pointer, 1));
  }
  /**
   * Checks if an entity is currently alive or not.
   * @param entityId The entity id to check
   * @returns `true` if alive, `false` if not.
   */
  isAlive(entityId) {
    const { u32, u64 } = memory.views, tableIndex = this.getTableIndex(entityId), row = this.getRow(entityId), ptr = this.#world.archetypes[tableIndex].getColumn(Entity);
    return getIndex(entityId) < Atomics.load(u32, this.#pointer) && (tableIndex === 0 || tableIndex !== 1 || u64[(ptr >> 3) + row] === entityId);
  }
  /**
   * Verifies if an entity has a specific component type.
   * @param entityId The id of the entity
   * @param componentType The type (class) of the component to detect.
   * @returns `boolean`, true if the entity has the component and false if it does not.
   */
  hasComponent(entityId, componentType) {
    const componentId = this.#world.components.indexOf(componentType);
    DEV_ASSERT(
      componentId !== -1,
      "hasComponent method must receive a component that exists in the world."
    );
    const archetype = this.#world.archetypes[this.getTableIndex(entityId)].bitfield, componentBit = 1n << BigInt(componentId);
    return (archetype & componentBit) === componentBit;
  }
  resetCursor() {
    const { u32 } = memory.views;
    if (u32[this.#pointer + 1] = 0, u32[this.#pointer] >= this.#capacity) {
      const newElementCount = Math.ceil((u32[this.#pointer] + 1) / ENTITY_BATCH_SIZE) * ENTITY_BATCH_SIZE;
      memory.reallocAt(this.#locationsPointer, newElementCount * 8), u32[this.#pointer + 3] = newElementCount;
    }
  }
  getTableIndex(entityId) {
    return memory.views.u32[this.#getOffset(entityId)] ?? 0;
  }
  setTableIndex(entityId, tableIndex) {
    memory.views.u32[this.#getOffset(entityId)] = tableIndex;
  }
  getRow(entityId) {
    return memory.views.u32[this.#getOffset(entityId) + 1] ?? 0;
  }
  setRow(entityId, row) {
    memory.views.u32[this.#getOffset(entityId) + 1] = row;
  }
  getBitset(entityId) {
    return this.#world.archetypes[this.getTableIndex(entityId)].bitfield;
  }
  get #locationsPointer() {
    return memory.views.u32[this.#pointer + 2];
  }
  set #locationsPointer(val) {
    memory.views.u32[this.#pointer + 2] = val;
  }
  get #capacity() {
    return memory.views.u32[this.#pointer + 3];
  }
  set #capacity(val) {
    memory.views.u32[this.#pointer + 3] = val;
  }
  #getOffset(entityId) {
    return (this.#locationsPointer >> 2) + (getIndex(entityId) << 1);
  }
  /**
   * Atomically grabs the current cursor.
   * @returns The current cursor value.
   */
  #getCursor() {
    return Atomics.load(memory.views.u32, this.#pointer + 1);
  }
  /**
   * Tries to atomically move the cursor by one.
   * @param expected The value the cursor is currently expected to be.
   * @returns A boolean, indicating if the move was successful or not.
   */
  #tryCursorMove(expected) {
    return expected === Atomics.compareExchange(
      memory.views.u32,
      this.#pointer + 1,
      expected,
      expected + 1
    );
  }
}
function getSystemRelationship(left, right) {
  return !left.parameters || !right.parameters ? 0 : left.parameters.some(
    (pL) => right.parameters.some(
      (pR) => pL.intersectsWith(pR) || pR.intersectsWith(pL)
    )
  ) ? 1 : 0;
}
function getSystemIntersections(systems) {
  return systems.map(
    (current) => systems.reduce(
      (acc, other, i) => acc | BigInt(getSystemRelationship(current, other)) << BigInt(i),
      0n
    )
  );
}
function* bits(val) {
  let i = 0;
  for (; val !== 0n; )
    (val & 1n) === 1n && (yield i), val >>= 1n, i++;
}
function getSystemDependencies(systems) {
  const masks = systems.map(() => 0n);
  for (let i = 0; i < systems.length; i++) {
    const system = systems[i];
    if (typeof system != "function") {
      for (const dependency of system.dependencies) {
        const dependencyIndex = systems.findIndex(
          (s2) => typeof s2 == "function" ? s2 === dependency : s2.system === dependency
        );
        DEV_ASSERT(
          dependencyIndex !== -1,
          `System "${system.system.name}" must run after system "${dependency.name}", but "${dependency.name}" is not in the schedule!`
        ), masks[i] |= 1n << BigInt(dependencyIndex);
      }
      for (const dependent of system.dependents) {
        const dependentIndex = systems.findIndex(
          (s2) => typeof s2 == "function" ? s2 === dependent : s2.system === dependent
        );
        DEV_ASSERT(
          dependentIndex !== -1,
          `System "${system.system.name}" must run before "${dependent.name}", but "${dependent.name}" is not in the schedule!`
        ), masks[dependentIndex] |= 1n << BigInt(i);
      }
    }
  }
  const deepDependencies = [...masks];
  deepDependencies.forEach(function mergeDependencies(mask, i) {
    for (const bit of bits(mask))
      mergeDependencies(deepDependencies[bit], bit), deepDependencies[i] |= deepDependencies[bit];
  });
  for (let i = 0; i < deepDependencies.length; i++) {
    const system = systems[i];
    DEV_ASSERT(
      (deepDependencies[i] & 1n << BigInt(i)) === 0n,
      `Circular dependency detected - sytem "${typeof system == "function" ? system.name : system.system.name}" depends on itself!`
    );
  }
  for (let i = 0; i < systems.length; i++) {
    const system = systems[i];
    if (typeof system != "function") {
      if (system.isFirst)
        for (let bit = 0; bit < systems.length; bit++)
          bit !== i && (deepDependencies[i] & 1n << BigInt(bit)) === 0n && (masks[bit] |= 1n << BigInt(i), deepDependencies[bit] |= 1n << BigInt(i));
      else if (system.isLast)
        for (let bit = 0; bit < systems.length; bit++)
          bit !== i && (deepDependencies[bit] & 1n << BigInt(i)) === 0n && (masks[i] |= 1n << BigInt(bit), deepDependencies[i] |= 1n << BigInt(bit));
    }
  }
  return masks;
}
function overlaps(arr, big, mode) {
  for (const bit of bits(big))
    if (arr[bit] === mode)
      return !1;
  return !0;
}
let nextId = 0;
const noop = (...args) => {
};
class ParallelExecutor {
  static fromWorld(world, systems, systemArguments) {
    const sys = systems.map((s2) => typeof s2 == "function" ? s2 : s2.system), intersections = world.threads.queue(
      () => getSystemIntersections(sys)
    ), dependencies = world.threads.queue(
      () => getSystemDependencies(systems)
    ), locallyAvailable = world.threads.isMainThread ? systems.map(() => !0) : systems.map((s2) => {
      const system = typeof s2 == "function" ? s2 : s2.system;
      return system.parameters ? system.parameters.every(
        (parameter) => !parameter.isLocalToThread()
      ) : !0;
    }), { buffer } = memory.views, pointer = world.threads.queue(
      () => memory.alloc(8 + systems.length * 3)
    ), lockName = world.threads.queue(
      () => `thyseus::ParallelExecutor${nextId++}`
    );
    return new this(
      world,
      sys,
      systemArguments,
      new Uint32Array(buffer, pointer, 2),
      new Uint8Array(buffer, pointer + 8, systems.length),
      new Uint8Array(
        buffer,
        pointer + 8 + systems.length,
        systems.length
      ),
      new Uint8Array(
        buffer,
        pointer + 8 + systems.length * 2,
        systems.length
      ),
      intersections,
      dependencies,
      locallyAvailable,
      lockName
    );
  }
  #resolveExecutionChange = noop;
  #resolveExecutionComplete = noop;
  #status;
  #toExecuteSystems;
  #executingSystems;
  #completedSystems;
  #locallyAvailable;
  #intersections;
  #dependencies;
  #lockName;
  #channel;
  #isMainThread;
  #systems;
  #arguments;
  constructor(world, systems, systemArguments, status, toExecuteSystems, executingSystems, completedSystems, intersections, dependencies, locallyAvailable, lockName) {
    this.#systems = systems, this.#arguments = systemArguments, this.#isMainThread = world.threads.isMainThread, this.#intersections = intersections, this.#dependencies = dependencies, this.#locallyAvailable = locallyAvailable, this.#status = status, this.#toExecuteSystems = toExecuteSystems, this.#executingSystems = executingSystems, this.#completedSystems = completedSystems, this.#channel = new BroadcastChannel(lockName), this.#lockName = lockName, this.#channel.addEventListener(
      "message",
      ({ data }) => {
        data === 0 ? this.#runSystems() : data === 1 ? (this.#resolveExecutionChange(), this.#resolveExecutionChange = noop) : (this.#resolveExecutionComplete(), this.#resolveExecutionComplete = noop);
      }
    );
  }
  get length() {
    return this.#systems.length;
  }
  async start() {
    return this.#systemsRemaining = this.#systems.length, this.#status[1] = 0, this.#toExecuteSystems.fill(1), this.#completedSystems.fill(0), this.#executingSystems.fill(0), this.#startOnAllThreads(), this.#runSystems();
  }
  get #systemsRemaining() {
    return this.#status[0];
  }
  set #systemsRemaining(val) {
    this.#status[0] = val;
  }
  async #runSystems() {
    for (; this.#systemsRemaining > 0; ) {
      let systemId = -1;
      if (await navigator.locks.request(this.#lockName, () => {
        systemId = this.#toExecuteSystems.findIndex(
          (isSet, id) => !!isSet && overlaps(this.#completedSystems, this.#dependencies[id], 0) && overlaps(this.#executingSystems, this.#intersections[id], 1) && this.#locallyAvailable[id]
        ), systemId !== -1 && (this.#toExecuteSystems[systemId] = 0, this.#executingSystems[systemId] = 1, this.#systemsRemaining--);
      }), systemId === -1) {
        await this.#awaitExecutionChange();
        continue;
      }
      await this.#systems[systemId](...this.#arguments[systemId]), await navigator.locks.request(this.#lockName, () => {
        this.#executingSystems[systemId] = 0, this.#completedSystems[systemId] = 1, Atomics.add(this.#status, 1, 1);
      }), this.#alertExecutionChange();
    }
    this.#isMainThread && Atomics.load(this.#status, 1) !== this.#systems.length && await this.#awaitExecutionComplete();
  }
  #startOnAllThreads() {
    this.#channel.postMessage(0);
  }
  #alertExecutionChange() {
    Atomics.load(this.#status, 1) === this.#systems.length ? this.#channel.postMessage(2) : this.#channel.postMessage(1);
  }
  async #awaitExecutionChange() {
    return new Promise((r2) => this.#resolveExecutionChange = r2);
  }
  async #awaitExecutionComplete() {
    return new Promise((r2) => this.#resolveExecutionComplete = r2);
  }
}
class SimpleExecutor {
  static fromWorld(_, systems, systemArguments) {
    const dependencies = getSystemDependencies(systems), order = dependencies.reduce(function addSystem(acc, val, i) {
      for (const bit of bits(val))
        addSystem(acc, dependencies[bit], bit);
      return acc.includes(i) || acc.push(i), acc;
    }, []);
    return new this(
      systems.map((s2) => typeof s2 == "function" ? s2 : s2.system),
      systemArguments,
      order
    );
  }
  #systems;
  #arguments;
  #systemOrder;
  constructor(systems, systemArguments, systemOrder) {
    this.#systems = systems, this.#arguments = systemArguments, this.#systemOrder = systemOrder;
  }
  get length() {
    return this.#systems.length;
  }
  async start() {
    for (const systemId of this.#systemOrder)
      await this.#systems[systemId](...this.#arguments[systemId]);
  }
}
class ThreadGroup {
  static new({ count, url, isMainThread }) {
    return new this(
      isMainThread ? Array.from(
        { length: count },
        () => new Worker(url, { type: "module" })
      ) : [globalThis],
      isMainThread
    );
  }
  isMainThread;
  #resolvers = /* @__PURE__ */ new Map();
  #resolvedData = /* @__PURE__ */ new Map();
  #listeners = {};
  #queue = [];
  #nextId = 0;
  #threads;
  constructor(threads, isMainThread) {
    this.#threads = threads, this.isMainThread = isMainThread;
    const handleMessage = ({
      currentTarget,
      data: [channel, id, message]
    }) => {
      if (this.#resolvers.has(id)) {
        const data = this.#resolvedData.get(id);
        data.push(message), data.length === this.#threads.length && (this.#resolvers.get(id)(data), this.#resolvers.delete(id), this.#resolvedData.delete(id));
      } else
        channel in this.#listeners ? currentTarget.postMessage([
          channel,
          id,
          this.#listeners[channel](message)
        ]) : currentTarget.postMessage([channel, id, null]);
    };
    for (const thread of this.#threads)
      thread.addEventListener("message", handleMessage);
  }
  setListener(channelName, listener) {
    this.#listeners[channelName] = listener;
  }
  deleteListener(channelName) {
    delete this.#listeners[channelName];
  }
  /**
   * Sends a value to a channel.
   * @param channel The channel to send the value to.
   * @param message The value to send.
   * @returns A promise, resolves to an array of results from all threads.
   */
  send(channel, data) {
    return this.#threads.length === 0 ? Promise.resolve([]) : new Promise((r2) => {
      const id = this.#nextId++;
      for (const thread of this.#threads)
        thread.postMessage([channel, id, data]);
      this.#resolvedData.set(id, []), this.#resolvers.set(id, r2);
    });
  }
  /**
   * On the main thread, creates a value, pushes it to the queue, and returns the value.
   *
   * On Worker threads, removes and returns the next item in the queue.
   *
   * **NOTE:** Queue must be manually sent between threads - use with `ThreadGroup.prototoype.wrapInQueue`.
   * @param create A function to create the value - only called on the main thread.
   * @returns The value created by `create` function.
   */
  queue(create) {
    if (this.isMainThread) {
      const val = create();
      return this.#queue.push(val), val;
    }
    return this.#queue.shift();
  }
  async wrapInQueue(callback) {
    const channel = "threadGroup::queue";
    let result;
    return this.isMainThread ? (result = await callback(), await this.send(channel, this.#queue)) : (result = await new Promise(
      (resolve) => this.setListener(channel, (queue) => {
        this.#queue = queue, resolve(callback());
      })
    ), this.deleteListener(channel)), this.#queue.length = 0, result;
  }
}
class WorldBuilder {
  schedules = {};
  components = /* @__PURE__ */ new Set();
  resources = /* @__PURE__ */ new Set();
  events = /* @__PURE__ */ new Set();
  #systems = /* @__PURE__ */ new Set();
  defaultExecutor;
  executors = {};
  config;
  url;
  constructor(config, url) {
    this.config = config, this.url = url, this.defaultExecutor = config.threads > 1 ? ParallelExecutor : SimpleExecutor, defaultPlugin(this);
  }
  /**
   * Adds systems to the default schedule of the world (`CoreSchedule.Main`).
   * @param systems The systems to add.
   * @returns `this`, for chaining.
   */
  addSystems(...systems) {
    return this.addSystemsToSchedule(CoreSchedule.Main, ...systems), this;
  }
  /**
   * Adds systems to the specified schedule.
   * @param schedule The schedule to add the systems to.
   * @param systems The systems to add.
   * @returns `this`, for chaining.
   */
  addSystemsToSchedule(schedule, ...systems) {
    schedule in systems || (this.schedules[schedule] = []);
    for (const s2 of systems) {
      const system = typeof s2 == "function" ? s2 : s2.system;
      this.#systems.add(system), DEV_ASSERT(
        // NOTE: We allow a mismatch here so long as systems receive at
        // least as many parameters as its length. Fewer than the length
        // is almost always the result of a failed transformation, but
        // more the length could just be the result of atypical typing.
        (system.parameters?.length ?? 0) >= system.length,
        `System "${system.name}" expects ${system.length} parameters, but will receive ${system.parameters?.length ?? 0}. This is likely due to a failed transformation.`
      );
    }
    return this.schedules[schedule].push(...systems), this;
  }
  /**
   * Passes this WorldBuilder to the provided plugin function.
   * @param plugin The plugin to pass this WorldBuilder to.
   * @returns `this`, for chaining.
   */
  addPlugin(plugin) {
    return plugin(this), this;
  }
  /**
   * Registers a component type in the world.
   * Called automatically for all queried components when a system is added.
   * @param componentType The componentType (`Struct`) to register.
   * @returns `this`, for chaining.
   */
  registerComponent(componentType) {
    return this.components.add(componentType), this;
  }
  /**
   * Registers a resource type in the world.
   * Called automatically for all accessed resources when a system is added.
   * @param resourceType The Resource type (`Class`) to register.
   * @returns `this`, for chaining.
   */
  registerResource(resourceType) {
    return this.resources.add(resourceType), this;
  }
  /**
   * Registers an event type in the world.
   * Called automatically for all event readers/writers when a system is added.
   * @param resourceType The Event type (`Struct`) to register.
   * @returns `this`, for chaining.
   */
  registerEvent(eventType) {
    return this.events.add(eventType), this;
  }
  /**
   * Sets the executor that schedules will use by default.
   * Individual schedules can specify their own executor; if they do not, this executor will be used.
   * @param executor The executor type to use by default.
   * @returns `this`, for chaining.
   */
  setDefaultExecutor(executor) {
    return this.defaultExecutor = executor, this;
  }
  /**
   * Sets the executor to use for a specific schedule.
   * @param schedule The schedule.
   * @param executor The executor type for this schedule.
   * @returns `this`, for chaining.
   */
  setExecutorForSchedule(schedule, executor) {
    return this.executors[schedule] = executor, this;
  }
  /**
   * Builds the world.
   * @returns `Promise<World>`
   */
  async build() {
    for (const key of Object.getOwnPropertySymbols(this.schedules))
      key in this.executors || (this.executors[key] = this.defaultExecutor);
    const threads = ThreadGroup.new({
      count: this.config.threads - 1,
      url: this.url,
      isMainThread: this.config.isMainThread
    }), world = await threads.wrapInQueue(async () => {
      const world2 = new World(
        this.config,
        threads,
        [...this.components],
        [...this.resources],
        [...this.events]
      ), systemArguments = /* @__PURE__ */ new Map();
      for (const system of this.#systems)
        systemArguments.set(
          system,
          await Promise.all(
            system.parameters?.map(
              (parameter) => parameter.intoArgument(world2)
            ) ?? []
          )
        );
      for (const key of Object.getOwnPropertySymbols(this.executors))
        world2.schedules[key] = this.executors[key].fromWorld(
          world2,
          this.schedules[key],
          this.schedules[key].map(
            (s2) => systemArguments.get(
              typeof s2 == "function" ? s2 : s2.system
            )
          )
        );
      return world2;
    });
    return threads.isMainThread && await Promise.all(
      //@ts-ignore
      world.resources.map((resource) => resource.initialize?.(world))
    ), world;
  }
}
class EventReader {
  #commands;
  #struct;
  #instance;
  #pointer;
  // [length, capacity, pointerStart, ...defaultData]
  constructor(commands, struct, pointer, instance) {
    instance === void 0 && (instance = new struct(), dropStruct(instance)), this.#commands = commands, this.#instance = instance, this.#struct = struct, this.#pointer = pointer >> 2;
  }
  /**
   * The event type (struct) for this queue.
   */
  get type() {
    return this.#struct;
  }
  /**
   * The number of events currently in this queue.
   */
  get length() {
    return memory.views.u32[this.#pointer];
  }
  *[Symbol.iterator]() {
    const size = this.#struct.size;
    this.#instance.__$$b = memory.views.u32[this.#pointer + 2];
    for (let i = 0; i < this.length; i++)
      yield this.#instance, this.#instance.__$$b += size;
  }
  /**
   * Sets this event queue to be cleared when commands are next processed.
   */
  clear() {
    const pointer = this.#commands.pushCommand(4, CLEAR_QUEUE_COMMAND);
    memory.views.u32[pointer >> 2] = this.#pointer << 2;
  }
}
class EventWriter extends EventReader {
  #instance;
  #pointer;
  // [length, capacity, pointerStart, ...defaultData]
  constructor(commands, struct, pointer) {
    const instance = new struct();
    dropStruct(instance), super(commands, struct, pointer, instance), this.#instance = instance, this.#pointer = pointer >> 2;
  }
  /**
   * Creates a new event and returns a mutable instance of that event.
   * Returned instance will be reused.
   *
   * @returns A mutable instance of the event.
   */
  create() {
    const byteOffset = this.#addEvent();
    return this.#instance.__$$b = byteOffset, memory.copy(this.#pointer + 3 << 2, this.type.size, byteOffset), this.#instance;
  }
  /**
   * Creates an event on the queue from a passed instance of a struct.
   * @param instance The event to add to the event queue.
   */
  createFrom(instance) {
    memory.copy(instance.__$$b, this.type.size, this.#addEvent());
  }
  /**
   * Creates an event with the default data for that event.
   */
  createDefault() {
    memory.copy(
      this.#pointer + 3 << 2,
      this.type.size,
      this.#addEvent()
    );
  }
  /**
   * **Immediately** clears all events in this queue.
   */
  clearImmediate() {
    memory.views.u32[this.#pointer] = 0;
  }
  /**
   * Increments length, returns a pointer to the new event (in queue).
   * Will grow queue, if necessary.
   */
  #addEvent() {
    const { length } = this;
    return length === memory.views.u32[this.#pointer + 1] && this.type.size !== 0 && (memory.reallocAt(
      this.#pointer + 2 << 2,
      length * this.type.size + 8 * this.type.size
    ), memory.views.u32[this.#pointer + 1] += 8), memory.views.u32[this.#pointer]++, length * this.type.size + memory.views.u32[this.#pointer + 2];
  }
}
const MB = 1048576, getCompleteConfig = (config = {}) => ({
  threads: 1,
  memorySize: 64 * MB,
  useSharedMemory: !1,
  isMainThread: typeof document < "u",
  getNewTableSize: (prev) => prev === 0 ? 8 : prev * 2,
  ...config
}), validateConfig = ({ threads, memorySize, useSharedMemory }, url) => {
  (threads > 1 || useSharedMemory) && (DEV_ASSERT(
    isSecureContext,
    "Invalid config - shared memory requires a secure context."
  ), DEV_ASSERT(
    typeof SharedArrayBuffer < "u",
    "Invalid config - shared memory requires SharedArrayBuffer."
  ), DEV_ASSERT(
    threads > 1 ? url : !0,
    "Invalid config - multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), DEV_ASSERT(
    Number.isInteger(threads) && 0 < threads && threads < 64,
    "Invalid config - threads must be an integer such that 0 < threads < 64",
    RangeError
  ), DEV_ASSERT(
    Number.isInteger(memorySize) && memorySize < 2 ** 32,
    "Invalid config - memorySize must be at most 4 GB ((2**32) - 1 bytes)"
  );
};
function validateAndCompleteConfig(inConfig, url) {
  const completeConfig = getCompleteConfig(inConfig);
  return validateConfig(completeConfig, url), completeConfig;
}
class World {
  static new(config, url) {
    return new WorldBuilder(validateAndCompleteConfig(config, url), url);
  }
  archetypes = [];
  #archetypeLookup = /* @__PURE__ */ new Map();
  queries = [];
  resources = [];
  eventReaders = [];
  eventWriters = [];
  schedules = {};
  commands;
  entities;
  config;
  threads;
  components;
  constructor(config, threads, components, resourceTypes, eventTypes) {
    this.config = config, this.threads = threads, memory.init(
      this.threads.queue(
        () => memory.init(
          config.memorySize,
          config.useSharedMemory || config.threads > 1
        )
      )
    ), this.components = components;
    const emptyTable = Table.createEmptyTable(this), recycledTable = Table.createRecycledTable(this);
    this.archetypes.push(emptyTable, recycledTable), this.#archetypeLookup.set(0n, recycledTable), this.entities = Entities.fromWorld(this), this.commands = Commands.fromWorld(this);
    for (const eventType of eventTypes) {
      const pointer = this.threads.queue(() => {
        const ptr = memory.alloc(12 + eventType.size);
        if (eventType.size !== 0) {
          const instance = new eventType();
          memory.copy(instance.__$$b, eventType.size, ptr + 12), memory.free(instance.__$$b);
        }
        return ptr;
      });
      this.eventReaders.push(
        new EventReader(this.commands, eventType, pointer)
      ), this.eventWriters.push(
        new EventWriter(this.commands, eventType, pointer)
      );
    }
    for (const resourceType of resourceTypes)
      if (isStruct(resourceType)) {
        const pointer = this.threads.queue(
          () => resourceType.size !== 0 ? memory.alloc(resourceType.size) : 0
        );
        this.resources.push(createManagedStruct(resourceType, pointer));
      } else
        threads.isMainThread && this.resources.push(new resourceType());
  }
  /**
   * Starts execution of the world.
   */
  start() {
    this.schedules[CoreSchedule.Outer].start();
  }
  /**
   * Runs the specified schedule.
   * Throws if that schedule cannot be found.
   * @param schedule The schedule to run.
   * @returns A promise that resolves when the schedule has completed
   */
  async runSchedule(schedule) {
    return DEV_ASSERT(
      schedule in this.schedules,
      `Could not find schedule (${String(schedule)}) in the world!`
    ), this.schedules[schedule].start();
  }
  /**
   * Gets the resource (instance) of the passed type.
   * @param resourceType The type of the resource to get.
   * @returns The resource instance.
   */
  getResource(resourceType) {
    return this.resources.find(
      (instance) => instance.constructor === resourceType
    );
  }
  moveEntity(entityId, targetTableId) {
    if (!this.entities.isAlive(entityId))
      return;
    const currentTable = this.archetypes[this.entities.getTableIndex(entityId)], targetTable = this.#getTable(targetTableId), row = this.entities.getRow(entityId), backfilledEntity = currentTable.move(row, targetTable);
    this.entities.setRow(backfilledEntity, row), this.entities.setTableIndex(entityId, targetTable.id), this.entities.setRow(entityId, targetTable.length - 1);
  }
  #getTable(tableId) {
    let table = this.#archetypeLookup.get(tableId);
    if (table)
      return table;
    const id = this.archetypes.length;
    table = Table.create(
      this,
      Array.from(bits(tableId), (cid) => this.components[cid]),
      tableId,
      id
    ), this.#archetypeLookup.set(tableId, table), this.archetypes.push(table);
    for (const query of this.queries)
      query.testAdd(table);
    return table;
  }
}
function cloneSystem(system) {
  const clone = system.bind(null);
  return clone.parameters = system.parameters, clone;
}
export {
  CoreSchedule,
  Entity,
  World,
  f as applyCommands,
  cloneSystem,
  dropStruct,
  g as initStruct,
  memory,
  r as run,
  s as struct
};
