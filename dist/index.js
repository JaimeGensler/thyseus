import { DEV } from "esm-env";
function DEV_ASSERT(condition, errorMessage, ErrorConstruction = Error) {
  if (DEV && !condition)
    throw new ErrorConstruction(errorMessage);
}
function alignTo8(x) {
  return x + 7 & -8;
}
const views = {};
let buffer, u8$1, u32$1, BUFFER_END = 0;
const NULL_POINTER = 8, BLOCK_HEADER_SIZE = 4, BLOCK_FOOTER_SIZE = 4, BLOCK_METADATA_SIZE = 8, MINIMUM_BLOCK_SIZE = 16;
function spinlock() {
  for (; Atomics.compareExchange(u32$1, NULL_POINTER >> 2, 0, 1) === 1; )
    ;
}
function releaseLock() {
  Atomics.store(u32$1, NULL_POINTER >> 2, 0);
}
function init(sizeOrBuffer, isShared = !1) {
  if (buffer)
    return buffer;
  if (typeof sizeOrBuffer == "number") {
    const bufferType = isShared ? SharedArrayBuffer : ArrayBuffer;
    buffer = new bufferType(alignTo8(sizeOrBuffer));
  } else
    buffer = sizeOrBuffer;
  return u8$1 = new Uint8Array(buffer), u32$1 = new Uint32Array(buffer), views.buffer = buffer, views.u8 = u8$1, views.u16 = new Uint16Array(buffer), views.u32 = u32$1, views.u64 = new BigUint64Array(buffer), views.i8 = new Int8Array(buffer), views.i16 = new Int16Array(buffer), views.i32 = new Int32Array(buffer), views.i64 = new BigInt64Array(buffer), views.f32 = new Float32Array(buffer), views.f64 = new Float64Array(buffer), views.dataview = new DataView(buffer), BUFFER_END = buffer.byteLength - 4, typeof sizeOrBuffer == "number" && (u32$1[1] = buffer.byteLength - 8, u32$1[u32$1.length - 2] = buffer.byteLength - 8, alloc(8)), buffer;
}
function alloc(size) {
  const alignedSize = alignTo8(size), requiredSize = BLOCK_METADATA_SIZE + alignedSize;
  let pointer = NULL_POINTER - BLOCK_HEADER_SIZE;
  for (spinlock(); pointer < BUFFER_END; ) {
    const header = u32$1[pointer >> 2], blockSize = header & -2;
    if (header !== blockSize || blockSize < requiredSize) {
      pointer += blockSize;
      continue;
    }
    const shouldSplit = blockSize - requiredSize >= MINIMUM_BLOCK_SIZE, newBlockSize = shouldSplit ? requiredSize : blockSize;
    if (u32$1[pointer >> 2] = newBlockSize | 1, u32$1[pointer + newBlockSize - BLOCK_FOOTER_SIZE >> 2] = newBlockSize | 1, shouldSplit) {
      const splitPointer = pointer + requiredSize, splitBlockSize = blockSize - requiredSize;
      u32$1[splitPointer >> 2] = splitBlockSize, u32$1[splitPointer + splitBlockSize - BLOCK_FOOTER_SIZE >> 2] = splitBlockSize;
    }
    return releaseLock(), pointer + BLOCK_HEADER_SIZE;
  }
  throw releaseLock(), new Error(`Out of memory (requesting ${size} bytes).`);
}
function free(pointer) {
  if (DEV_ASSERT(
    pointer % 8 === 0,
    "Invalid pointer in free - pointer was not correctly aligned."
  ), pointer === NULL_POINTER || pointer === 0)
    return;
  let header = pointer - BLOCK_HEADER_SIZE;
  spinlock();
  let size = u32$1[header >> 2] & -2, footer = header + size - BLOCK_FOOTER_SIZE;
  if (u32$1[header >> 2] &= -2, u32$1[footer >> 2] &= -2, footer !== buffer.byteLength - BLOCK_FOOTER_SIZE) {
    const next = u32$1[header + size >> 2];
    next & 1 || (footer += next, size += next);
  }
  if (header !== 0) {
    const prev = u32$1[header - BLOCK_FOOTER_SIZE >> 2];
    prev & 1 || (header -= prev, size += prev);
  }
  u32$1[header >> 2] = size, u32$1[footer >> 2] = size, u8$1.fill(0, header + BLOCK_HEADER_SIZE, footer - BLOCK_HEADER_SIZE), releaseLock();
}
function realloc(pointer, newSize) {
  if (DEV_ASSERT(
    pointer % 8 === 0,
    "Invalid pointer in realloc - pointer was not correctly aligned."
  ), pointer === NULL_POINTER || pointer === 0)
    return alloc(newSize);
  const alignedSize = alignTo8(newSize);
  spinlock();
  const header = pointer - BLOCK_HEADER_SIZE, size = u32$1[header >> 2] & -2, payloadSize = size - BLOCK_METADATA_SIZE;
  if (payloadSize >= alignedSize)
    return releaseLock(), pointer;
  const next = header + size, nextSize = u32$1[next >> 2];
  if (!(nextSize & 1) && nextSize - BLOCK_METADATA_SIZE >= alignedSize - size) {
    const remainderSize = alignedSize - payloadSize, shouldSplit = nextSize - remainderSize >= MINIMUM_BLOCK_SIZE, newBlockSize = shouldSplit ? alignedSize + BLOCK_METADATA_SIZE : size + nextSize;
    if (u32$1[next >> 2] = 0, u32$1[next - BLOCK_FOOTER_SIZE >> 2] = 0, u32$1[header >> 2] = newBlockSize | 1, u32$1[header + newBlockSize - BLOCK_FOOTER_SIZE >> 2] = newBlockSize | 1, shouldSplit) {
      const splitSize = size + nextSize - newBlockSize;
      u32$1[header + newBlockSize >> 2] = splitSize, u32$1[header + newBlockSize + splitSize - BLOCK_FOOTER_SIZE >> 2] = splitSize;
    }
    return releaseLock(), pointer;
  }
  releaseLock();
  const newPointer = alloc(alignedSize);
  return copy(pointer, payloadSize, newPointer), free(pointer), newPointer;
}
function copy(from, length, to) {
  u8$1.copyWithin(to, from, from + length);
}
function set(from, length, value) {
  u8$1.fill(value, from, from + length);
}
function copyPointer(pointer) {
  if (pointer === NULL_POINTER || pointer === 0)
    return NULL_POINTER;
  const size = (u32$1[pointer - BLOCK_HEADER_SIZE >> 2] & -2) - BLOCK_METADATA_SIZE, newPointer = alloc(size);
  return copy(pointer, size, newPointer), newPointer;
}
function reallocAt(location, newSize) {
  DEV_ASSERT(
    location % 4 === 0,
    "Invalid pointer in reallocAt - pointer was not correctly aligned"
  ), u32$1[location >> 2] = realloc(u32$1[location >> 2], newSize);
}
function UNSAFE_CLEAR_ALL() {
  buffer && (set(0, buffer.byteLength, 0), u32$1[1] = buffer.byteLength - 8, u32$1[u32$1.length - 2] = buffer.byteLength - 8, alloc(8));
}
const memory = {
  init,
  get isInitialized() {
    return buffer !== void 0;
  },
  alloc,
  free,
  realloc,
  reallocAt,
  copy,
  copyPointer,
  set,
  views,
  UNSAFE_CLEAR_ALL
};
class BaseEntity {
  #commands;
  constructor(commands) {
    this.#commands = commands;
  }
  get id() {
    return 0n;
  }
  /**
   * Queues a component to be inserted into this entity.
   * @param component The component instance to insert into the entity.
   * @returns `this`, for chaining.
   */
  add(component) {
    return this.#commands.insertInto(this.id, component), this;
  }
  /**
   * Queues a component type to be inserted into this entity.
   * @param componentType The component class to insert into the entity.
   * @returns `this`, for chaining.
   */
  addType(componentType) {
    return this.#commands.insertTypeInto(this.id, componentType), this;
  }
  /**
   * Queues a component to be removed from this entity.
   * @param Component The Component **class** to remove from the entity.
   * @returns `this`, for chaining.
   */
  remove(Component) {
    return this.#commands.removeFrom(this.id, Component), this;
  }
  /**
   * Queues this entity to be despawned.
   * @returns `void`
   */
  despawn() {
    this.#commands.despawn(this.id);
  }
}
class EntityCommands extends BaseEntity {
  #id;
  constructor(commands, id) {
    super(commands), this.#id = id;
  }
  get id() {
    return this.#id;
  }
}
let byteOffset = 0;
function initStruct(instance) {
  DEV_ASSERT(
    memory.isInitialized,
    // Structs require memory to be initialized.
    "Tried to create a struct before memory was initialized."
  ), !instance.__$$b && (instance.__$$b = byteOffset !== 0 ? byteOffset : memory.alloc(instance.constructor.size));
}
function dropStruct(instance) {
  const structType = instance.constructor, byteOffset2 = instance.__$$b;
  for (const pointer of structType.pointers ?? [])
    memory.free(memory.views.u32[byteOffset2 + pointer >> 2]);
  memory.free(byteOffset2);
}
function createManagedStruct(type, pointer) {
  byteOffset = pointer;
  const instance = new type();
  return byteOffset = 0, instance;
}
class Entity extends BaseEntity {
  static size = 8;
  static alignment = 8;
  #entities;
  constructor(commands, entities) {
    DEV_ASSERT(
      commands && entities,
      "An instance of the Entity component did not receive World commands and entities. This is likely a result of using Entity as a substruct, which is currently not supported."
    ), super(commands), this.#entities = entities, initStruct(this);
  }
  /**
   * The entity's world-unique integer id (uint64).
   * Composed of an entity's generation & index.
   */
  get id() {
    return memory.views.u64[this.__$$b >> 3];
  }
  /**
   * The index of this entity (uint32).
   */
  get index() {
    return memory.views.u32[this.__$$b >> 2];
  }
  /**
   * The generation of this entity (uint32).
   */
  get generation() {
    return memory.views.u32[(this.__$$b >> 2) + 1];
  }
  /**
   * Verifies if this entity has a specific component type.
   * @param componentType The type (class) of the component to detect.
   * @returns `boolean`, true if the entity has the component and false if it does not.
   */
  hasComponent(componentType) {
    return this.#entities.hasComponent(this.id, componentType);
  }
}
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
    const { u32: u322, u64: u642 } = memory.views;
    if (this.#components[0] !== Entity)
      return targetTable.length++, BigInt(index);
    const ptr = this.getColumn(Entity), lastEntity = u642[(ptr >> 3) + this.length];
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
          memory.free(u322[componentPointer + pointerOffset >> 2]);
    }
    return targetTable.length++, this.delete(index), lastEntity;
  }
  grow() {
    memory.views.u32[(this.#pointer >> 2) + 1] = this.#world.config.getNewTableSize(this.capacity);
    let i = 8;
    for (const component of this.#components)
      memory.reallocAt(
        this.#pointer + i,
        component.size * this.capacity
      ), i += 4;
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
        const { u32: u322 } = memory.views, pointer = memory.alloc(4 * 4) >> 2;
        return u322[pointer + 2] = memory.alloc(8 * ENTITY_BATCH_SIZE), u322[pointer + 3] = ENTITY_BATCH_SIZE, pointer;
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
    const { u32: u322, u64: u642 } = memory.views, recycledSize = this.#recycled.length, recycledPtr = this.#recycled.getColumn(Entity);
    for (let currentCursor = this.#getCursor(); currentCursor < recycledSize; currentCursor = this.#getCursor())
      if (this.#tryCursorMove(currentCursor))
        return u642[(recycledPtr >> 3) + currentCursor] + ONE_GENERATION;
    return BigInt(Atomics.add(u322, this.#pointer, 1));
  }
  /**
   * Checks if an entity is currently alive or not.
   * @param entityId The entity id to check
   * @returns `true` if alive, `false` if not.
   */
  isAlive(entityId) {
    const { u32: u322, u64: u642 } = memory.views, tableIndex = this.getTableIndex(entityId), row = this.getRow(entityId), ptr = this.#world.archetypes[tableIndex].getColumn(Entity);
    return getIndex(entityId) < Atomics.load(u322, this.#pointer) && (tableIndex === 0 || tableIndex !== 1 || u642[(ptr >> 3) + row] === entityId);
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
    const { u32: u322 } = memory.views;
    if (u322[this.#pointer + 1] = 0, u322[this.#pointer] >= this.#capacity) {
      const newElementCount = Math.ceil((u322[this.#pointer] + 1) / ENTITY_BATCH_SIZE) * ENTITY_BATCH_SIZE;
      memory.reallocAt(this.#pointer + 2 << 2, newElementCount * 8), u322[this.#pointer + 3] = newElementCount;
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
const REMOVE_COMPONENT_COMMAND = 0, ADD_COMPONENT_COMMAND = 1, CLEAR_QUEUE_COMMAND = 2;
class Commands {
  static fromWorld(world) {
    const initialValuePointers = world.threads.queue(() => {
      const size = world.components.reduce(
        (acc, val) => acc + val.size,
        0
      ), componentPointers = [];
      let pointer = memory.alloc(size);
      for (const component of world.components) {
        if (componentPointers.push(pointer), component.size === 0)
          continue;
        const instance = component === Entity ? new component(this, world.entities) : new component();
        memory.copy(instance.__$$b, component.size, pointer), memory.free(instance.__$$b), pointer += component.size;
      }
      return componentPointers;
    }), dataPointer = world.threads.queue(
      () => memory.alloc((1 + 3 * world.config.threads) * 4)
    );
    return new this(world, initialValuePointers, dataPointer);
  }
  #command = { type: 0, dataStart: 0, dataSize: 0 };
  #entities;
  #components;
  #initialValuePointers;
  #pointer;
  // [nextId, ...[size, capacity, pointer]]
  #ownPointer;
  constructor(world, initialValuePointers, pointer) {
    this.#entities = world.entities, this.#components = world.components, this.#initialValuePointers = initialValuePointers, this.#pointer = pointer >> 2, this.#ownPointer = 3 * Atomics.add(memory.views.u32, this.#pointer, 1) + this.#pointer + 1;
  }
  get #size() {
    return memory.views.u32[this.#ownPointer];
  }
  set #size(val) {
    memory.views.u32[this.#ownPointer] = val;
  }
  get #capacity() {
    return memory.views.u32[this.#ownPointer + 1];
  }
  set #capacity(val) {
    memory.views.u32[this.#ownPointer + 1] = val;
  }
  /**
   * Queues an entity to be spawned.
   * @returns `EntityCommands`, which can add/remove components from an entity.
   */
  spawn() {
    const entityId = this.#entities.spawn(), dataStart = this.#pushComponentCommand(
      ADD_COMPONENT_COMMAND,
      entityId,
      Entity
    );
    return memory.views.u64[dataStart >> 3] = entityId, new EntityCommands(this, entityId);
  }
  /**
   * Queues an entity to be despawned.
   * @param id The id of the entity to despawn.
   * @returns `this`, for chaining.
   */
  despawn(id) {
    this.#pushComponentCommand(REMOVE_COMPONENT_COMMAND, id, Entity);
  }
  /**
   * Gets `EntityCommands` for an Entity.
   * @param id The id of the entity to get.
   * @returns `EntityCommands`, which can add/remove components from an entity.
   */
  getEntityById(id) {
    return new EntityCommands(this, id);
  }
  insertInto(entityId, component) {
    const componentType = component.constructor;
    DEV_ASSERT(
      componentType !== Entity,
      "Tried to add Entity component, which is forbidden."
    );
    const dataStart = this.#pushComponentCommand(
      ADD_COMPONENT_COMMAND,
      entityId,
      componentType
    );
    componentType.size !== 0 && (memory.copy(component.__$$b, componentType.size, dataStart), this.#copyPointers(componentType, dataStart));
  }
  insertTypeInto(entityId, componentType) {
    DEV_ASSERT(
      componentType !== Entity,
      "Tried to add Entity component, which is forbidden."
    );
    const dataStart = this.#pushComponentCommand(
      ADD_COMPONENT_COMMAND,
      entityId,
      componentType
    );
    componentType.size !== 0 && (memory.copy(
      this.#initialValuePointers[this.#components.indexOf(componentType)],
      componentType.size,
      dataStart
    ), this.#copyPointers(componentType, dataStart));
  }
  removeFrom(entityId, componentType) {
    DEV_ASSERT(
      componentType !== Entity,
      "Tried to remove Entity component, which is forbidden."
    ), this.#pushComponentCommand(
      REMOVE_COMPONENT_COMMAND,
      entityId,
      componentType
    );
  }
  *[Symbol.iterator]() {
    const { u32: u322 } = memory.views, queueDataLength = 1 + u322[this.#pointer] * 3;
    for (let queueOffset = 1; queueOffset < queueDataLength; queueOffset += 3) {
      const start = u322[this.#pointer + queueOffset + 2], end = start + u322[this.#pointer + queueOffset];
      for (let current = start; current < end; current += u322[current >> 2])
        this.#command.type = u322[current + 4 >> 2], this.#command.dataSize = u322[current >> 2] - 8, this.#command.dataStart = current + 8, yield this.#command;
    }
  }
  pushCommand(size, type) {
    const { u32: u322 } = memory.views, addedSize = 8 + alignTo8(size);
    let newSize = this.#size + addedSize;
    this.#capacity < newSize && (newSize <<= 1, memory.reallocAt(this.#ownPointer + 2 << 2, newSize), this.#capacity = newSize);
    const queueEnd = u322[this.#ownPointer + 2] + this.#size;
    return u322[queueEnd >> 2] = addedSize, u322[queueEnd + 4 >> 2] = type, this.#size += addedSize, queueEnd + 8;
  }
  reset() {
    const { u32: u322 } = memory.views, queueDataLength = 1 + u322[this.#pointer] * 3;
    for (let queueOffset = 1; queueOffset < queueDataLength; queueOffset += 3)
      u322[this.#pointer + queueOffset] = 0;
  }
  #pushComponentCommand(commandType, entityId, componentType) {
    DEV_ASSERT(
      this.#components.includes(componentType),
      `Tried to add/remove unregistered component (${componentType.name}) on an Entity.`
    );
    const pointer = this.pushCommand(
      16 + alignTo8(commandType * componentType.size),
      commandType
    );
    return memory.views.u64[pointer >> 3] = entityId, memory.views.u16[pointer + 8 >> 1] = this.#components.indexOf(componentType), pointer + 16;
  }
  #copyPointers(componentType, dataStart) {
    for (const pointer of componentType.pointers ?? [])
      memory.views.u32[dataStart + pointer >> 2] = memory.copyPointer(
        memory.views.u32[dataStart + pointer >> 2]
      );
  }
}
let CommandsDescriptor$1 = class {
  isLocalToThread() {
    return !1;
  }
  intersectsWith(other) {
    return !1;
  }
  intoArgument(world) {
    return world.commands;
  }
  onAddSystem(builder) {
  }
}, WorldDescriptor$1 = class {
  isLocalToThread() {
    return !0;
  }
  intersectsWith(other) {
    return !0;
  }
  intoArgument(world) {
    return world;
  }
  onAddSystem(builder) {
  }
};
class Query {
  #elements = [];
  #pointer;
  #with;
  #without;
  #components;
  #isIndividual;
  #commands;
  #entities;
  constructor(withFilters, withoutFilters, isIndividual, components, world) {
    this.#pointer = world.threads.queue(() => memory.alloc(12)), this.#with = withFilters, this.#without = withoutFilters, this.#isIndividual = isIndividual, this.#components = components, this.#commands = world.commands, this.#entities = world.entities;
  }
  /**
   * The number of entities that match this query.
   */
  get length() {
    const { u32: u322 } = memory.views, tableCount = u322[this.#pointer >> 2], jump = this.#components.length + 1;
    let length = 0, cursor = u322[this.#pointer + 8 >> 2] >> 2;
    for (let i = 0; i < tableCount; i++)
      length += u322[u322[cursor] >> 2], cursor += jump;
    return length;
  }
  get #size() {
    return memory.views.u32[this.#pointer >> 2];
  }
  set #size(val) {
    memory.views.u32[this.#pointer >> 2] = val;
  }
  get #capacity() {
    return memory.views.u32[this.#pointer + 4 >> 2];
  }
  set #capacity(val) {
    memory.views.u32[this.#pointer + 4 >> 2] = val;
  }
  *[Symbol.iterator]() {
    const { u32: u322 } = memory.views, elements = this.#getIteration(), tableCount = u322[this.#pointer >> 2];
    let cursor = u322[this.#pointer + 8 >> 2] >> 2;
    for (let i = 0; i < tableCount; i++) {
      const tableLength = u322[u322[cursor] >> 2];
      if (cursor++, tableLength !== 0) {
        for (const element of elements)
          element.__$$b = u322[u322[cursor] >> 2], cursor++;
        for (let j = 0; j < tableLength; j++) {
          yield this.#isIndividual ? elements[0] : elements;
          for (const element of elements)
            element && (element.__$$b += element.constructor.size);
        }
      }
    }
    this.#elements.push(elements);
  }
  forEach(callback) {
    if (this.#isIndividual)
      for (const element of this)
        callback(element);
    else
      for (const elements of this)
        callback(...elements);
  }
  #getIteration() {
    return this.#elements.pop() ?? this.#components.map((comp) => {
      const instance = comp === Entity ? new comp(this.#commands, this.#entities) : new comp();
      return dropStruct(instance), instance;
    });
  }
  testAdd(table) {
    const { u32: u322 } = memory.views;
    if (this.#test(table.bitfield)) {
      if (this.#size === this.#capacity) {
        const additionalSize = 8 * (this.#components.length + 1);
        memory.reallocAt(
          this.#pointer + 8,
          (this.#size + additionalSize) * 4
        ), this.#capacity += 8;
      }
      let cursor = (u322[this.#pointer + 8 >> 2] >> 2) + this.#size * (this.#components.length + 1);
      this.#size++, u322[cursor] = table.getTableSizePointer();
      for (const component of this.#components)
        cursor++, u322[cursor] = table.getColumnPointer(component);
    }
  }
  #test(n) {
    for (let i = 0; i < this.#with.length; i++)
      if ((this.#with[i] & n) === this.#with[i] && (this.#without[i] & n) === 0n)
        return !0;
    return !1;
  }
}
class Optional {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}
class Mut {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}
class With {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}
class Without {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}
class Or {
  #l;
  #r;
  constructor(l, r) {
    this.#l = l, this.#r = r;
  }
  get l() {
    return this.#l;
  }
  get r() {
    return this.#r;
  }
}
const getBitfieldForComponentSet = (allComponents, components, optionals = []) => (Array.isArray(components) ? components : [components]).reduce(
  (acc, val, i) => optionals[i] ? acc : acc | 1n << BigInt(allComponents.indexOf(val)),
  0n
);
function visitQueryFilters(filters, visitor, initialValue) {
  let currentValue = initialValue;
  for (const filter of Array.isArray(filters) ? filters : [filters])
    currentValue = visitor(currentValue, filter);
  return currentValue;
}
function registerFilters(builder, filters) {
  visitQueryFilters(filters, function visitor(_, f) {
    f instanceof With || f instanceof Without ? (f.value instanceof Array ? f.value : [f.value]).forEach((comp) => builder.registerComponent(comp)) : f instanceof Or && (visitQueryFilters(f.l, visitor), visitQueryFilters(f.r, visitor));
  });
}
function createFilterBitfields(allComponents, accessors, optionals, filters) {
  const result = visitQueryFilters(
    filters,
    function visitor(acc, filter) {
      if (filter instanceof With) {
        const apply = getBitfieldForComponentSet(
          allComponents,
          filter.value
        );
        return {
          withs: acc.withs.map((e) => e | apply),
          withouts: acc.withouts
        };
      } else if (filter instanceof Without) {
        const apply = getBitfieldForComponentSet(
          allComponents,
          filter.value
        );
        return {
          withs: acc.withs,
          withouts: acc.withouts.map((e) => e | apply)
        };
      } else if (filter instanceof Or) {
        const l = visitQueryFilters(filter.l, visitor, acc), r = visitQueryFilters(filter.r, visitor, acc);
        return {
          withs: [...l.withs, ...r.withs],
          withouts: [...l.withouts, ...r.withouts]
        };
      }
      throw new Error(
        `Unrecognized filter (${filter.constructor.name}) in Query.`
      );
    },
    {
      withs: [
        getBitfieldForComponentSet(allComponents, accessors, optionals)
      ],
      withouts: [0n]
    }
  ), toKeep = result.withs.reduce(
    (acc, _, i) => (result.withs[i] & result.withouts[i]) === 0n ? acc.add(i) : acc,
    /* @__PURE__ */ new Set()
  );
  return result.withs = result.withs.filter((_, i) => toKeep.has(i)), result.withouts = result.withouts.filter((_, i) => toKeep.has(i)), DEV_ASSERT(
    result.withs.length > 0,
    "Tried to construct a query that cannot match any entities."
  ), result;
}
let QueryDescriptor$1 = class QueryDescriptor {
  components = [];
  writes = [];
  optionals = [];
  filters;
  isIndividual;
  constructor(accessors, filters = []) {
    this.isIndividual = !Array.isArray(accessors);
    const iter = Array.isArray(accessors) ? accessors : [accessors];
    for (const accessor of iter) {
      const isMut = accessor instanceof Mut || accessor instanceof Optional && accessor.value instanceof Mut;
      this.writes.push(isMut), this.optionals.push(accessor instanceof Optional);
      const component = accessor instanceof Mut ? accessor.value : accessor instanceof Optional ? accessor.value instanceof Mut ? accessor.value.value : accessor.value : accessor;
      DEV_ASSERT(
        component.size > 0,
        "You may not request direct access to ZSTs - use a With filter instead."
      ), this.components.push(component);
    }
    this.filters = filters;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(other) {
    return other instanceof QueryDescriptor ? this.components.some(
      (compA, iA) => other.components.some(
        (compB, iB) => compA === compB && (this.writes[iA] || other.writes[iB])
      )
    ) : !1;
  }
  onAddSystem(builder) {
    this.components.forEach((comp) => builder.registerComponent(comp)), registerFilters(builder, this.filters);
  }
  intoArgument(world) {
    const { withs, withouts } = createFilterBitfields(
      world.components,
      this.components,
      this.optionals,
      this.filters
    ), query = new Query(
      withs,
      withouts,
      this.isIndividual,
      this.components,
      world
    );
    return world.queries.push(query), query;
  }
};
const TYPE_TO_CONSTRUCTOR = {
  u8: Uint8Array,
  u16: Uint16Array,
  u32: Uint32Array,
  u64: BigUint64Array,
  i8: Int8Array,
  i16: Int16Array,
  i32: Int32Array,
  i64: BigInt64Array,
  f32: Float32Array,
  f64: Float64Array
};
let currentAlignment = 1, currentSize = 0;
const keys = [], alignments = [];
let currentOffset = {}, currentPointers = {};
const updateOffsets = (newKey, alignment, byteLength) => {
  const position = alignments.reduce(
    (acc, value, i) => value < alignment && i < acc ? i : acc,
    alignments.length
  );
  if (position === alignments.length) {
    keys.push(newKey), alignments.push(alignment), currentOffset[newKey] = keys.length === 0 ? 0 : currentSize;
    return;
  }
  const occupyKey = keys[position];
  keys.splice(position, 0, newKey), alignments.splice(position, 0, alignment), currentOffset[newKey] = currentOffset[occupyKey];
  for (let i = position + 1; i < keys.length; i++)
    currentOffset[keys[i]] += byteLength;
};
function addField(fieldName, alignment, byteLength, pointers) {
  return currentAlignment = Math.max(currentAlignment, alignment), pointers && (currentPointers[fieldName] = pointers), updateOffsets(fieldName, alignment, byteLength), currentSize += byteLength, currentOffset;
}
function resetFields() {
  const pointers = [];
  for (const key in currentPointers)
    for (const pointer of currentPointers[key])
      pointers.push(pointer + currentOffset[key]);
  const result = {
    size: Math.ceil(currentSize / currentAlignment) * currentAlignment,
    alignment: currentAlignment,
    pointers
  };
  return currentSize = 0, currentAlignment = 1, currentOffset = {}, keys.length = 0, alignments.length = 0, result;
}
function createPrimativeFieldDecorator(typeName) {
  return function(prototype, propertyKey) {
    const type = TYPE_TO_CONSTRUCTOR[typeName], offset = addField(
      propertyKey,
      type.BYTES_PER_ELEMENT,
      type.BYTES_PER_ELEMENT
    ), shift = 31 - Math.clz32(type.BYTES_PER_ELEMENT);
    Object.defineProperty(prototype, propertyKey, {
      enumerable: !0,
      get() {
        return memory.views[typeName][this.__$$b + offset[propertyKey] >> shift];
      },
      set(value) {
        memory.views[typeName][this.__$$b + offset[propertyKey] >> shift] = value;
      }
    });
  };
}
const u8 = createPrimativeFieldDecorator("u8"), u16 = createPrimativeFieldDecorator("u16"), u32 = createPrimativeFieldDecorator("u32"), u64 = createPrimativeFieldDecorator("u64"), i8 = createPrimativeFieldDecorator("i8"), i16 = createPrimativeFieldDecorator("i16"), i32 = createPrimativeFieldDecorator("i32"), i64 = createPrimativeFieldDecorator("i64"), f32 = createPrimativeFieldDecorator("f32"), f64 = createPrimativeFieldDecorator("f64"), bool = function(prototype, propertyKey) {
  const offset = addField(
    propertyKey,
    Uint8Array.BYTES_PER_ELEMENT,
    Uint8Array.BYTES_PER_ELEMENT
  );
  Object.defineProperty(prototype, propertyKey, {
    enumerable: !0,
    get() {
      return !!memory.views.u8[this.__$$b + offset[propertyKey]];
    },
    set(value) {
      memory.views.u8[this.__$$b + offset[propertyKey]] = Number(value);
    }
  });
};
function getByteLength(val) {
  let byteLength = val.length;
  for (let i = val.length - 1; i >= 0; i--) {
    const code = val.charCodeAt(i);
    code > 127 && code <= 2047 ? byteLength++ : code > 2047 && code <= 65535 && (byteLength += 2), code >= 56320 && code <= 57343 && i--;
  }
  return byteLength;
}
const encoder = new TextEncoder(), decoder = new TextDecoder();
function string(prototype, propertyKey) {
  const offset = addField(
    propertyKey,
    Uint32Array.BYTES_PER_ELEMENT,
    Uint32Array.BYTES_PER_ELEMENT * 3,
    [8]
  );
  Object.defineProperty(prototype, propertyKey, {
    enumerable: !0,
    get() {
      const start = this.__$$b + offset[propertyKey], length = memory.views.u32[start >> 2], ptr = memory.views.u32[start + 8 >> 2];
      return decoder.decode(memory.views.u8.subarray(ptr, ptr + length));
    },
    set(value) {
      const byteLength = getByteLength(value), start = this.__$$b + offset[propertyKey], capacity = memory.views.u32[start + 4 >> 2];
      let pointer = memory.views.u32[start + 8 >> 2];
      if (capacity < byteLength) {
        const newPointer = memory.realloc(pointer, byteLength);
        pointer = newPointer, memory.views.u32[start + 4 >> 2] = byteLength, memory.views.u32[start + 8 >> 2] = newPointer;
      }
      memory.views.u32[start >> 2] = byteLength, encoder.encodeInto(
        value,
        memory.views.u8.subarray(pointer, pointer + byteLength)
      );
    }
  });
}
function array({ type, length }) {
  return function(prototype, propertyKey) {
    const typeConstructor = TYPE_TO_CONSTRUCTOR[type], offset = addField(
      propertyKey,
      typeConstructor.BYTES_PER_ELEMENT,
      typeConstructor.BYTES_PER_ELEMENT * length
    ), shift = 31 - Math.clz32(typeConstructor.BYTES_PER_ELEMENT);
    Object.defineProperty(prototype, propertyKey, {
      enumerable: !0,
      get() {
        return memory.views[type].subarray(
          this.__$$b + offset[propertyKey] >> shift,
          (this.__$$b + offset[propertyKey] >> shift) + length
        );
      },
      set(value) {
        memory.views[type].set(
          value.subarray(0, length),
          this.__$$b + offset[propertyKey] >> shift
        );
      }
    });
  };
}
function substruct(struct3) {
  return function(prototype, propertyKey) {
    const offset = addField(
      propertyKey,
      struct3.alignment,
      struct3.size,
      struct3.pointers
    );
    Object.defineProperty(prototype, propertyKey, {
      enumerable: !0,
      get() {
        return createManagedStruct(
          struct3,
          this.__$$b + offset[propertyKey]
        );
      },
      set(value) {
        memory.copy(value.__$$b, struct3.size, this.__$$b);
      }
    });
  };
}
const struct = function(targetClass) {
  const { size, alignment, pointers } = resetFields();
  return class extends targetClass {
    static size = size;
    static alignment = alignment;
    static pointers = pointers;
    constructor(...args) {
      super(...args), initStruct(this);
    }
  };
};
struct.bool = bool;
struct.u8 = u8;
struct.u16 = u16;
struct.u32 = u32;
struct.u64 = u64;
struct.i8 = i8;
struct.i16 = i16;
struct.i32 = i32;
struct.i64 = i64;
struct.f32 = f32;
struct.f64 = f64;
struct.string = string;
struct.array = array;
struct.substruct = substruct;
function isStruct(val) {
  return typeof val == "function" && //@ts-ignore
  typeof val.size == "number" && //@ts-ignore
  typeof val.alignment == "number";
}
let ResourceDescriptor$1 = class ResourceDescriptor {
  resourceType;
  canWrite;
  constructor(resource) {
    const isMut = resource instanceof Mut;
    this.resourceType = isMut ? resource.value : resource, this.canWrite = isMut;
  }
  isLocalToThread() {
    return !isStruct(this.resourceType);
  }
  intersectsWith(other) {
    return other instanceof ResourceDescriptor ? this.resourceType === other.resourceType && (this.canWrite || other.canWrite) : !1;
  }
  onAddSystem(builder) {
    builder.registerResource(this.resourceType);
  }
  intoArgument(world) {
    return !world.threads.isMainThread && !isStruct(this.resourceType) ? null : world.getResource(this.resourceType);
  }
}, SystemResourceDescriptor$1 = class {
  resourceType;
  constructor(resource) {
    this.resourceType = resource;
  }
  isLocalToThread() {
    return !isStruct(this.resourceType);
  }
  intersectsWith(other) {
    return !1;
  }
  onAddSystem(builder) {
  }
  async intoArgument({ threads }) {
    const { resourceType } = this, instance = isStruct(resourceType) ? createManagedStruct(
      resourceType,
      resourceType.size !== 0 ? threads.queue(() => memory.alloc(resourceType.size)) : 0
    ) : new resourceType();
    return threads.isMainThread && await instance.initialize?.(), instance;
  }
};
function applyCommands(world, entityDestinations) {
  const { commands, entities, archetypes, components } = world;
  entities.resetCursor(), entityDestinations.clear();
  for (const { type, dataStart } of commands) {
    if (type === CLEAR_QUEUE_COMMAND) {
      const queueLengthPointer = memory.views.u32[dataStart >> 2];
      memory.views.u32[queueLengthPointer >> 2] = 0;
    }
    if (type !== ADD_COMPONENT_COMMAND && type !== REMOVE_COMPONENT_COMMAND)
      continue;
    const entityId = memory.views.u64[dataStart >> 3];
    let val = entityDestinations.get(entityId);
    if (val === 0n)
      continue;
    const componentId = memory.views.u16[dataStart + 8 >> 1];
    val ??= entities.getBitset(entityId), entityDestinations.set(
      entityId,
      type === ADD_COMPONENT_COMMAND ? val | 1n << BigInt(componentId) : componentId === 0 ? 0n : val ^ 1n << BigInt(componentId)
    );
  }
  for (const [entityId, tableId] of entityDestinations)
    world.moveEntity(entityId, tableId);
  for (const { type, dataStart } of commands) {
    if (type !== ADD_COMPONENT_COMMAND)
      continue;
    const entityId = memory.views.u64[dataStart >> 3], tableId = entities.getTableIndex(entityId);
    if (tableId === 0 || tableId === 1)
      continue;
    const componentId = memory.views.u16[dataStart + 8 >> 1];
    archetypes[tableId].copyComponentIntoRow(
      entities.getRow(entityId),
      components[componentId],
      dataStart + 16
    );
  }
  commands.reset();
}
applyCommands.parameters = [
  new WorldDescriptor$1(),
  new SystemResourceDescriptor$1(Map)
];
const Main = Symbol("MainSchedule"), FixedUpdate = Symbol("FixedUpdateSchedule"), Startup = Symbol("StartupSchedule"), Outer = Symbol("OuterSchedule"), CoreSchedule = {
  Main,
  FixedUpdate,
  Startup,
  Outer
};
class SystemConfig {
  dependents = [];
  dependencies = [];
  isFirst = !1;
  isLast = !1;
  system;
  constructor(system) {
    this.system = system;
  }
  /**
   * Specifies that this system must run _before_ the provided systems may run.
   * @param ...systems The systems that this system must run before.
   * @returns `this`, for chaining.
   */
  before(...systems) {
    return this.dependents.push(...systems), this;
  }
  /**
   * Specifies that this system must run _after_ the provided systems have run.
   * @param ...systems The systems that this system must run after.
   * @returns `this`, for chaining.
   */
  after(...systems) {
    return this.dependencies.push(...systems), this;
  }
  /**
   * Specifies that this system should try to run before any other systems in the schedule have run.
   * Systems ordered to run before this will still run before.
   * @returns `this`, for chaining.
   */
  first() {
    return DEV_ASSERT(
      !this.isLast,
      "A system cannot be ordered to run both first and last!"
    ), this.isFirst = !0, this;
  }
  /**
   * Specifies that this system should try to run after all other systems in the schedule have run.
   * @returns `this`, for chaining.
   */
  last() {
    return DEV_ASSERT(
      !this.isFirst,
      "A system cannot be ordered to run both first and last!"
    ), this.isLast = !0, this;
  }
}
const run = (system) => new SystemConfig(system);
run.chain = (...systems) => systems.map(
  (system, i) => i === 0 ? system : new SystemConfig(system).after(systems[i - 1])
);
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
          (s) => typeof s == "function" ? s === dependency : s.system === dependency
        );
        DEV_ASSERT(
          dependencyIndex !== -1,
          `System "${system.system.name}" must run after system "${dependency.name}", but "${dependency.name}" is not in the schedule!`
        ), masks[i] |= 1n << BigInt(dependencyIndex);
      }
      for (const dependent of system.dependents) {
        const dependentIndex = systems.findIndex(
          (s) => typeof s == "function" ? s === dependent : s.system === dependent
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
    const sys = systems.map((s) => typeof s == "function" ? s : s.system), intersections = world.threads.queue(
      () => getSystemIntersections(sys)
    ), dependencies = world.threads.queue(
      () => getSystemDependencies(systems)
    ), locallyAvailable = world.threads.isMainThread ? systems.map(() => !0) : systems.map((s) => {
      const system = typeof s == "function" ? s : s.system;
      return system.parameters ? system.parameters.every(
        (parameter) => !parameter.isLocalToThread()
      ) : !0;
    }), { buffer: buffer2 } = memory.views, pointer = world.threads.queue(
      () => memory.alloc(8 + systems.length * 3)
    ), lockName = world.threads.queue(
      () => `thyseus::ParallelExecutor${nextId++}`
    );
    return new this(
      world,
      sys,
      systemArguments,
      new Uint32Array(buffer2, pointer, 2),
      new Uint8Array(buffer2, pointer + 8, systems.length),
      new Uint8Array(
        buffer2,
        pointer + 8 + systems.length,
        systems.length
      ),
      new Uint8Array(
        buffer2,
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
    return new Promise((r) => this.#resolveExecutionChange = r);
  }
  async #awaitExecutionComplete() {
    return new Promise((r) => this.#resolveExecutionComplete = r);
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
      systems.map((s) => typeof s == "function" ? s : s.system),
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
async function runInnerSchedules(world) {
  if (world.schedules[CoreSchedule.Outer].length > 1)
    return;
  await world.runSchedule(CoreSchedule.Startup);
  let previousTime = 0, delta = 0;
  async function loop(currentTime) {
    await world.runSchedule(CoreSchedule.Main), delta = currentTime - previousTime;
    for (let i = delta; i > 20; i -= 20)
      await world.runSchedule(CoreSchedule.FixedUpdate);
    requestAnimationFrame(loop);
  }
  loop(0);
}
runInnerSchedules.parameters = [new WorldDescriptor$1()];
function defaultPlugin(builder) {
  builder.registerComponent(Entity).addSystemsToSchedule(CoreSchedule.Outer, runInnerSchedules).addSystemsToSchedule(CoreSchedule.Main, run(applyCommands).last()).addSystemsToSchedule(CoreSchedule.Startup, run(applyCommands).last());
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
    return this.#threads.length === 0 ? Promise.resolve([]) : new Promise((r) => {
      const id = this.#nextId++;
      for (const thread of this.#threads)
        thread.postMessage([channel, id, data]);
      this.#resolvedData.set(id, []), this.#resolvers.set(id, r);
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
    schedule in this.schedules || (this.schedules[schedule] = []);
    for (const s of systems) {
      const system = typeof s == "function" ? s : s.system;
      if (this.#systems.add(system), system.parameters)
        for (const descriptor of system.parameters)
          descriptor.onAddSystem(this);
      DEV_ASSERT(
        // We allow a mismatch here so long as systems receive at least
        // as many parameters as its length. Fewer than the length is
        // probably the result of a failed transformation, but more than
        // the length could just be the result of handwritten params.
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
            (s) => systemArguments.get(
              typeof s == "function" ? s : s.system
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
  constructor(commands, struct3, pointer, instance) {
    instance === void 0 && (instance = new struct3(), dropStruct(instance)), this.#commands = commands, this.#instance = instance, this.#struct = struct3, this.#pointer = pointer >> 2;
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
  constructor(commands, struct3, pointer) {
    const instance = new struct3();
    dropStruct(instance), super(commands, struct3, pointer, instance), this.#instance = instance, this.#pointer = pointer >> 2;
  }
  /**
   * Creates a new event and returns a mutable instance of that event.
   * Returned instance will be reused.
   *
   * @returns A mutable instance of the event.
   */
  create() {
    const byteOffset2 = this.#addEvent();
    return this.#instance.__$$b = byteOffset2, memory.copy(this.#pointer + 3 << 2, this.type.size, byteOffset2), this.#instance;
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
let EventReaderDescriptor$1 = class EventReaderDescriptor {
  eventType;
  constructor(eventType) {
    this.eventType = eventType;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(other) {
    return other instanceof EventWriterDescriptor$1 ? this.eventType === other.eventType : other instanceof EventReaderDescriptor ? this instanceof EventWriterDescriptor$1 && this.eventType === other.eventType : !1;
  }
  onAddSystem(builder) {
    builder.registerEvent(this.eventType);
  }
  intoArgument(world) {
    return world.eventReaders.find((rd) => rd.type === this.eventType);
  }
}, EventWriterDescriptor$1 = class extends EventReaderDescriptor$1 {
  intoArgument(world) {
    return world.eventWriters.find((wr) => wr.type === this.eventType);
  }
};
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
function wrap(Descriptor) {
  return (...args) => new Descriptor(...args);
}
const CommandsDescriptor2 = wrap(CommandsDescriptor$1), QueryDescriptor2 = wrap(QueryDescriptor$1), ResourceDescriptor2 = wrap(ResourceDescriptor$1), SystemResourceDescriptor2 = wrap(SystemResourceDescriptor$1), WorldDescriptor2 = wrap(WorldDescriptor$1), EventReaderDescriptor2 = wrap(EventReaderDescriptor$1), EventWriterDescriptor2 = wrap(EventWriterDescriptor$1), MutDescriptor = wrap(Mut), WithDescriptor = wrap(With), WithoutDescriptor = wrap(Without), OrDescriptor = wrap(Or);
export {
  CommandsDescriptor2 as CommandsDescriptor,
  CoreSchedule,
  Entity,
  EventReaderDescriptor2 as EventReaderDescriptor,
  EventWriterDescriptor2 as EventWriterDescriptor,
  MutDescriptor,
  OrDescriptor,
  QueryDescriptor2 as QueryDescriptor,
  ResourceDescriptor2 as ResourceDescriptor,
  SystemResourceDescriptor2 as SystemResourceDescriptor,
  WithDescriptor,
  WithoutDescriptor,
  World,
  WorldDescriptor2 as WorldDescriptor,
  applyCommands,
  cloneSystem,
  dropStruct,
  initStruct,
  memory,
  run,
  struct
};
