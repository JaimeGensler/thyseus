import "esm-env";
import { m as memory, E as Entity, a as dropStruct, D as DEV_ASSERT, i as isStruct, S as SystemResourceDescriptor$1, W as WorldDescriptor$1 } from "./defaultPlugin-6e1eea47.js";
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
    const { u32 } = memory.views, tableCount = u32[this.#pointer >> 2], jump = this.#components.length + 1;
    let length = 0, cursor = u32[this.#pointer + 8 >> 2] >> 2;
    for (let i = 0; i < tableCount; i++)
      length += u32[u32[cursor] >> 2], cursor += jump;
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
    const { u32 } = memory.views, elements = this.#getIteration(), tableCount = u32[this.#pointer >> 2];
    let cursor = u32[this.#pointer + 8 >> 2] >> 2;
    for (let i = 0; i < tableCount; i++) {
      const tableLength = u32[u32[cursor] >> 2];
      if (cursor++, tableLength !== 0) {
        for (const element of elements)
          element.__$$b = u32[u32[cursor] >> 2], cursor++;
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
    const { u32 } = memory.views;
    if (this.#test(table.bitfield)) {
      if (this.#size === this.#capacity) {
        const additionalSize = 8 * (this.#components.length + 1);
        memory.reallocAt(
          this.#pointer + 8,
          (this.#size + additionalSize) * 4
        ), this.#capacity += 8;
      }
      let cursor = (u32[this.#pointer + 8 >> 2] >> 2) + this.#size * (this.#components.length + 1);
      this.#size++, u32[cursor] = table.getTableSizePointer();
      for (const component of this.#components)
        cursor++, u32[cursor] = table.getColumnPointer(component);
    }
  }
  #test(n) {
    for (let i = 0; i < this.#with.length; i++)
      if ((this.#with[i] & n) === this.#with[i] && (this.#without[i] & n) === 0n)
        return !0;
    return !1;
  }
}
let Optional$1 = class {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}, Mut$1 = class {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}, With$1 = class {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}, Without$1 = class {
  #value;
  constructor(value) {
    this.#value = value;
  }
  get value() {
    return this.#value;
  }
}, Or$1 = class {
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
};
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
    f instanceof With$1 || f instanceof Without$1 ? (f.value instanceof Array ? f.value : [f.value]).forEach((comp) => builder.registerComponent(comp)) : f instanceof Or$1 && (visitQueryFilters(f.l, visitor), visitQueryFilters(f.r, visitor));
  });
}
function createFilterBitfields(allComponents, accessors, optionals, filters) {
  const result = visitQueryFilters(
    filters,
    function visitor(acc, filter) {
      if (filter instanceof With$1) {
        const apply = getBitfieldForComponentSet(
          allComponents,
          filter.value
        );
        return {
          withs: acc.withs.map((e) => e | apply),
          withouts: acc.withouts
        };
      } else if (filter instanceof Without$1) {
        const apply = getBitfieldForComponentSet(
          allComponents,
          filter.value
        );
        return {
          withs: acc.withs,
          withouts: acc.withouts.map((e) => e | apply)
        };
      } else if (filter instanceof Or$1) {
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
      const isMut = accessor instanceof Mut$1 || accessor instanceof Optional$1 && accessor.value instanceof Mut$1;
      this.writes.push(isMut), this.optionals.push(accessor instanceof Optional$1);
      const component = accessor instanceof Mut$1 ? accessor.value : accessor instanceof Optional$1 ? accessor.value instanceof Mut$1 ? accessor.value.value : accessor.value : accessor;
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
}, ResourceDescriptor$1 = class ResourceDescriptor {
  resourceType;
  canWrite;
  constructor(resource) {
    const isMut = resource instanceof Mut$1;
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
}, EventReaderDescriptor$1 = class EventReaderDescriptor {
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
function wrap(Descriptor) {
  return (...args) => new Descriptor(...args);
}
const CommandsDescriptor2 = wrap(CommandsDescriptor$1), QueryDescriptor2 = wrap(QueryDescriptor$1), ResourceDescriptor2 = wrap(ResourceDescriptor$1), SystemResourceDescriptor = wrap(SystemResourceDescriptor$1), WorldDescriptor = wrap(WorldDescriptor$1), EventReaderDescriptor2 = wrap(EventReaderDescriptor$1), EventWriterDescriptor2 = wrap(EventWriterDescriptor$1), Mut2 = wrap(Mut$1), With2 = wrap(With$1), Without2 = wrap(Without$1), Optional2 = wrap(Optional$1), Or2 = wrap(Or$1);
export {
  CommandsDescriptor2 as CommandsDescriptor,
  EventReaderDescriptor2 as EventReaderDescriptor,
  EventWriterDescriptor2 as EventWriterDescriptor,
  Mut2 as Mut,
  Optional2 as Optional,
  Or2 as Or,
  QueryDescriptor2 as QueryDescriptor,
  ResourceDescriptor2 as ResourceDescriptor,
  SystemResourceDescriptor,
  With2 as With,
  Without2 as Without,
  WorldDescriptor
};
