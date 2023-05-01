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
class WorldDescriptor {
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
}
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
class SystemResourceDescriptor {
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
}
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
    const componentId = memory.views.u32[dataStart + 8 >> 2];
    archetypes[tableId].copyComponentIntoRow(
      entities.getRow(entityId),
      components[componentId],
      dataStart + 16
    );
  }
  commands.reset();
}
applyCommands.parameters = [
  new WorldDescriptor(),
  new SystemResourceDescriptor(Map)
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
runInnerSchedules.parameters = [new WorldDescriptor()];
function defaultPlugin(builder) {
  builder.registerComponent(Entity).addSystemsToSchedule(CoreSchedule.Outer, runInnerSchedules).addSystemsToSchedule(CoreSchedule.Main, run(applyCommands).last()).addSystemsToSchedule(CoreSchedule.Startup, run(applyCommands).last());
}
export {
  CoreSchedule as C,
  DEV_ASSERT as D,
  Entity as E,
  SystemResourceDescriptor as S,
  WorldDescriptor as W,
  dropStruct as a,
  CLEAR_QUEUE_COMMAND as b,
  Commands as c,
  defaultPlugin as d,
  createManagedStruct as e,
  applyCommands as f,
  initStruct as g,
  isStruct as i,
  memory as m,
  run as r,
  struct as s
};
