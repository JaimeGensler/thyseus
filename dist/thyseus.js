class P {
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return !1;
  }
  intoArgument(t) {
    return t.commands;
  }
  onAddSystem(t) {
  }
}
var l = /* @__PURE__ */ ((i) => (i[i.Read = 0] = "Read", i[i.Write = 1] = "Write", i))(l || {});
function $(i, t) {
  return k(i, t);
}
const k = (i, t) => t.reduce(
  (e, s) => e | 1n << BigInt(i.indexOf(s)),
  0n
);
function E(i) {
  return [i, 1];
}
E.isMut = function(i) {
  return Array.isArray(i) && i.length === 2 && typeof i[0] == "function" && i[1] === 1;
};
class F {
  #e;
  #t = [];
  #s;
  #i;
  constructor(t, e, s) {
    this.#i = e, this.#s = t, this.#e = this.#i.map(
      (n) => new n({}, 0, s)
    );
  }
  *[Symbol.iterator]() {
    for (const t of this.#t)
      for (let e = 0; e < t.size; e++) {
        for (const s of this.#e) {
          const n = t.columns.get(
            Object.getPrototypeOf(s).constructor
          );
          s.store = n, s.eid = e;
        }
        yield this.#e;
      }
  }
  testAdd(t, e) {
    this.#n(t) && this.#t.push(e);
  }
  #n(t) {
    return (t & this.#s) === this.#s;
  }
}
class C {
  components = [];
  accessType = [];
  constructor(t) {
    for (const e of t) {
      const s = E.isMut(e);
      this.components.push(s ? e[0] : e), this.accessType.push(s ? l.Write : l.Read);
    }
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof C ? this.components.some(
      (e, s) => t.components.some(
        (n, o) => e === n && (this.accessType[s] === l.Write || t.accessType[o] === l.Write)
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e));
  }
  intoArgument(t) {
    const e = new F(
      $(t.components, this.components),
      this.components,
      t.commands
    );
    return t.queries.push(e), e;
  }
}
const L = 32n, D = 0x00000000ffffffffn, g = (i) => Number(i & D), W = (i) => Number(i >> L);
class y {
  static schema = { val: BigUint64Array };
  static size = 8;
  store;
  index;
  commands;
  constructor(t, e, s) {
    this.store = t, this.index = e, this.commands = s;
  }
  get id() {
    return this.store.val[this.index];
  }
  get entityIndex() {
    return g(this.id);
  }
  get generation() {
    return W(this.id);
  }
  insert(t) {
    return this.commands.insertInto(this.id, t), this;
  }
  remove(t) {
    return this.commands.removeFrom(this.id, t), this;
  }
  despawn() {
    this.commands.despawn(this.id);
  }
}
function x(i, t) {
  const e = i.config.getNewTableSize(0), s = i.createBuffer(t.size * e);
  let n = 0;
  return Object.entries(t.schema).reduce(
    (o, [r, a]) => (o[r] = new a(s, n, e), n += e * a.BYTES_PER_ELEMENT, o),
    {}
  );
}
function Q(i, t, e, s) {
  const n = i.createBuffer(t.size * e);
  let o = 0;
  return Object.entries(t.schema).reduce(
    (r, [a, h]) => (r[a] = new h(n, o, e), r[a].set(s[a], 0), o += e * h.BYTES_PER_ELEMENT, r),
    {}
  );
}
class v {
  columns;
  meta;
  static create(t, e) {
    const s = new Uint32Array(2);
    return s[1] = t.config.getNewTableSize(0), new this(
      e.reduce(
        (n, o) => n.set(o, x(t, o)),
        /* @__PURE__ */ new Map()
      ),
      s
    );
  }
  constructor(t, e) {
    this.columns = t, this.meta = e;
  }
  get size() {
    return this.meta[0];
  }
  set size(t) {
    this.meta[0] = t;
  }
  get capacity() {
    return this.meta[1];
  }
  set capacity(t) {
    this.meta[1] = t;
  }
  get isFull() {
    return this.capacity === this.size;
  }
  add(t) {
    this.columns.get(y).val[this.size++] = t;
  }
  delete(t) {
    for (const [, e] of this.columns)
      for (const s in e)
        e[s][t] = e[s][this.size - 1];
    this.size--;
  }
  move(t, e) {
    for (const [s, n] of this.columns)
      if (e.columns.has(s)) {
        const o = e.columns.get(s);
        for (const r in n)
          o[r][e.size] = n[r][t], n[r][t] = n[r][this.size - 1];
      }
    e.size++, this.size--;
  }
  grow(t) {
    this.capacity = t.config.getNewTableSize(this.capacity);
    for (const [e, s] of this.columns)
      this.columns.set(
        e,
        Q(t, e, this.capacity, s)
      );
  }
}
let B = {}, T = 0;
function u() {
  return function(t) {
    class e extends t {
      static schema = B;
      static size = T;
      store;
      index;
      constructor(n, o) {
        super(), this.store = n, this.index = o;
      }
    }
    return B = {}, T = 0, e;
  };
}
function f(i) {
  return function() {
    return function(e, s) {
      B[s] = i, T += i.BYTES_PER_ELEMENT, Object.defineProperty(e, s, {
        enumerable: !0,
        get() {
          return this.store[s][this.index];
        },
        set(n) {
          this.store[s][this.index] = n;
        }
      });
    };
  };
}
u.bool = function() {
  return function(t, e) {
    B[e] = Uint8Array, T += Uint8Array.BYTES_PER_ELEMENT, Object.defineProperty(t, e, {
      enumerable: !0,
      get() {
        return !!this.store[e][this.index];
      },
      set(s) {
        this.store[e][this.index] = Number(s);
      }
    });
  };
};
u.u8 = f(Uint8Array);
u.u16 = f(Uint16Array);
u.u32 = f(Uint32Array);
u.u64 = f(BigUint64Array);
u.i8 = f(Int8Array);
u.i16 = f(Int16Array);
u.i32 = f(Int32Array);
u.i64 = f(BigInt64Array);
u.f32 = f(Float32Array);
u.f64 = f(Float64Array);
function N(i) {
  return typeof i == "function" && typeof i.size == "number" && typeof i.schema == "object";
}
class I {
  resource;
  accessType;
  constructor(t) {
    const e = E.isMut(t);
    this.resource = e ? t[0] : t, this.accessType = e ? l.Write : l.Read;
  }
  isLocalToThread() {
    return !N(this.resource);
  }
  intersectsWith(t) {
    return t instanceof I ? this.resource === t.resource && (this.accessType === l.Write || t.accessType === l.Write) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class j {
  isLocalToThread() {
    return !0;
  }
  intersectsWith(t) {
    return !0;
  }
  intoArgument(t) {
    return t;
  }
  onAddSystem(t) {
  }
}
function A(i) {
  return (...t) => new i(...t);
}
const Y = {
  Commands: A(P),
  Query: A(C),
  Res: A(I),
  World: A(j),
  Mut: E
};
function _(i, t) {
  return {
    parameters: i(Y),
    fn: t
  };
}
function m(i, t, e = Error) {
  if (!i)
    throw new e(t);
}
function* S(i) {
  let t = 0;
  for (; i !== 0n; )
    (i & 1n) === 1n && (yield t), i >>= 1n, t++;
}
function V(i, t, e) {
  const s = Array.from({ length: i.length }, () => 0n), n = (o, r) => (s[o] & 1n << BigInt(r)) !== 0n;
  return t.forEach((o, r) => {
    if (!!o) {
      for (const a of o.before ?? []) {
        const h = i.indexOf(a);
        h !== -1 && (m(
          !n(r, h),
          `Circular dependency detected: ${i[r].fn.name} (${r}) and ${i[h].fn.name} (${h}) depend on each other.`
        ), s[h] |= 1n << BigInt(r));
      }
      for (const a of o.after ?? []) {
        const h = i.indexOf(a);
        h !== -1 && (m(
          !n(h, r),
          `Circular dependency detected: ${i[r].fn.name} (${r}) and ${i[h].fn.name} (${h}) depend on each other.`
        ), s[r] |= 1n << BigInt(h));
      }
    }
  }), s.forEach((o, r) => {
    m(
      !n(r, r),
      `Circular dependency detected: ${i[r].fn.name} (${r}) and ${i[r].fn.name} (${r}) depend on each other.`
    );
  }), t.forEach((o, r) => {
    if (!!o) {
      if (o.beforeAll)
        for (const a of S(e[r]))
          a !== r && (s[r] & 1n << BigInt(a)) === 0n && (s[a] |= 1n << BigInt(r));
      if (o.afterAll)
        for (const a of S(e[r]))
          a !== r && (s[a] & 1n << BigInt(r)) === 0n && (s[r] |= 1n << BigInt(a));
    }
  }), s.forEach((o, r) => s[r] &= e[r]), s;
}
function X(i, t) {
  return i.parameters.some(
    (e) => t.parameters.some(
      (s) => e.intersectsWith(s) || s.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function H(i) {
  return i.map(
    (t) => i.reduce(
      (e, s, n) => e | BigInt(X(t, s)) << BigInt(n),
      0n
    )
  );
}
const J = (i, t) => {
  for (const [e, s] of t) {
    const n = i.get(e);
    n === void 0 ? i.set(e, s) : n !== 0n && i.set(e, n | s);
  }
  return i;
}, Z = _(
  ({ World: i }) => [i()],
  async function(t) {
    const e = (await t.threads.send(
      "thyseus::getCommandQueue"
    )).reduce(J, t.commands.queue);
    for (const [s, n] of e)
      t.moveEntity(s, n);
    e.clear();
  }
);
function G(i, t) {
  const e = [...t];
  return [...i].reduce(
    (s, n, o) => s.set(n, e[o]),
    /* @__PURE__ */ new Map()
  );
}
function K(i) {
  i.addSystem(Z, { afterAll: !0 }), i.registerComponent(y), i.registerThreadChannel("thyseus::getCommandQueue", (t) => () => {
    const e = new Map(t.commands.queue);
    return t.commands.queue.clear(), e;
  }), i.registerThreadChannel(
    "thyseus::newTable",
    (t) => ([e, s, n]) => {
      const o = G(
        [...S(e)].map((a) => t.components[a]),
        s
      ), r = new v(o, n);
      t.archetypes.set(e, r);
      for (const a of t.queries)
        a.testAdd(e, r);
    }
  ), i.registerThreadChannel(
    "thyseus::growTable",
    (t) => ([e, s]) => {
      const n = t.archetypes.get(e);
      let o = 0;
      for (const r of n.columns.keys())
        n.columns.set(r, s[o++]);
    }
  );
}
class b {
  static isMainThread = !!globalThis.document;
  isMainThread = b.isMainThread;
  static spawn(t, e) {
    return new this(
      b.isMainThread ? Array.from(
        { length: t },
        () => new Worker(e, { type: "module" })
      ) : [globalThis]
    );
  }
  #e = 0;
  #t = /* @__PURE__ */ new Map();
  #s = {};
  #i = [];
  #n;
  constructor(t) {
    this.#n = t;
    const e = ({
      currentTarget: s,
      data: [n, o, r]
    }) => {
      this.#t.has(n) ? (this.#t.get(n)(r), this.#t.delete(n)) : o in this.#s ? s.postMessage([
        n,
        o,
        this.#s[o](r)
      ]) : s.postMessage([n, o, null]);
    };
    for (const s of this.#n)
      s.addEventListener("message", e);
  }
  setListener(t, e) {
    this.#s[t] = e;
  }
  deleteListener(t) {
    delete this.#s[t];
  }
  send(t, e) {
    return Promise.all(
      this.#n.map((s) => {
        const n = this.#e++;
        return s.postMessage([n, t, e]), new Promise((o) => this.#t.set(n, o));
      })
    );
  }
  queue(t) {
    if (b.isMainThread) {
      const e = t();
      return this.#i.push(e), e;
    } else
      return this.#i.shift();
  }
  async wrapInQueue(t) {
    const e = "@@";
    let s;
    return this.isMainThread ? (s = await t(), await this.send(e, this.#i)) : (s = await new Promise(
      (n) => this.setListener(e, (o) => {
        this.#i = o, n(t());
      })
    ), this.deleteListener(e)), this.#i.length = 0, s;
  }
}
class tt {
  systems = [];
  systemDependencies = [];
  #e = [];
  components = /* @__PURE__ */ new Set();
  resources = /* @__PURE__ */ new Set();
  threadChannels = {};
  config;
  url;
  constructor(t, e) {
    this.config = t, this.url = e, K(this);
  }
  addSystem(t, e) {
    return this.systems.push(t), this.systemDependencies.push(e), this.#t(t), this;
  }
  addStartupSystem(t) {
    return this.#e.push(t), this.#t(t), this;
  }
  addPlugin(t) {
    return t(this), this;
  }
  registerComponent(t) {
    return this.components.add(t), this;
  }
  registerResource(t) {
    return this.resources.add(t), this;
  }
  registerThreadChannel(t, e) {
    return this.threadChannels[t] = e, this;
  }
  async build() {
    const t = b.spawn(this.config.threads - 1, this.url), e = await t.wrapInQueue(
      () => new ht(
        this.config,
        t,
        [...this.components],
        [...this.resources],
        this.systems,
        this.systemDependencies,
        this.threadChannels
      )
    );
    if (t.isMainThread) {
      await Promise.all(
        Array.from(
          e.resources.values(),
          (s) => s.initialize?.(e)
        )
      );
      for (const { fn: s, parameters: n } of this.#e)
        await s(...n.map((o) => o.intoArgument(e)));
    }
    return await t.wrapInQueue(() => {
    }), e;
  }
  #t(t) {
    t.parameters.forEach((e) => e.onAddSystem(this));
  }
}
const z = 0b11111111n;
class q {
  static getBufferLength(t, e) {
    return Math.ceil(t / 8) * e;
  }
  #e;
  width;
  length;
  #t;
  constructor(t, e, s) {
    this.width = t, this.length = e, this.#t = s, this.#e = Math.ceil(this.width / 8);
  }
  get bytesPerElement() {
    return this.#e;
  }
  get byteLength() {
    return this.#t.byteLength;
  }
  get(t) {
    let e = 0n;
    const s = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      e |= BigInt(this.#t[s + n]) << BigInt(n * 8);
    return e;
  }
  set(t, e) {
    const s = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      this.#t[s + n] = Number(e >> BigInt(n * 8) & z);
  }
  OR(t, e) {
    const s = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      this.#t[s + n] |= Number(e >> BigInt(n * 8) & z);
  }
  XOR(t, e) {
    const s = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      this.#t[s + n] ^= Number(e >> BigInt(n * 8) & z);
  }
}
const p = {
  push(i, t) {
    i[i[i.length - 1]] = t, i[i.length - 1]++;
  },
  size(i) {
    return i[i.length - 1];
  },
  *iter(i) {
    const t = i[i.length - 1];
    for (let e = 0; e < t; e++)
      yield i[e];
  },
  delete(i, t) {
    i[t] = i[p.size(i) - 1], i[i.length - 1]--;
  }
};
let et = 0;
class st {
  static fromWorld(t, e, s) {
    const n = t.threads.queue(
      () => H(e)
    ), o = t.threads.queue(
      () => V(e, s, n)
    ), r = t.threads.isMainThread ? e.reduce(
      (d, M, U) => M.parameters.some(
        (O) => O.isLocalToThread()
      ) ? d.add(U) : d,
      /* @__PURE__ */ new Set()
    ) : /* @__PURE__ */ new Set(), a = t.threads.queue(
      () => new Uint16Array(t.createBuffer(2 * e.length + 2))
    ), h = new q(
      e.length,
      2,
      t.threads.queue(
        () => new Uint8Array(
          t.createBuffer(
            q.getBufferLength(e.length, 2)
          )
        )
      )
    ), c = t.threads.queue(() => String(et++));
    return new this(
      n,
      o,
      a,
      h,
      r,
      c
    );
  }
  #e = new BroadcastChannel("thyseus::executor");
  #t = [];
  #s;
  #i;
  #n;
  #r;
  #o;
  #a;
  constructor(t, e, s, n, o, r) {
    this.#s = t, this.#i = e, this.#n = s, this.#r = n, this.#o = o, this.#a = r, this.#e.addEventListener("message", () => {
      this.#t.forEach((a) => a(0)), this.#t.length = 0;
    });
  }
  start() {
    this.#h();
  }
  reset() {
    this.#r.set(0, 0n), this.#r.set(1, 0n);
    for (let t = 0; t < this.#i.length; t++)
      this.#o.has(t) || p.push(this.#n, t);
  }
  #h() {
    this.#e.postMessage(0), this.#t.forEach((t) => t(0)), this.#t.length = 0;
  }
  async #c() {
    return new Promise((t) => this.#t.push(t));
  }
  async onReady(t) {
    await this.#c(), t();
  }
  async *[Symbol.asyncIterator]() {
    const t = new Set(this.#o);
    for (; p.size(this.#n) + t.size > 0; ) {
      const e = p.size(this.#n);
      let s = -1;
      await navigator.locks.request(this.#a, () => {
        const n = this.#r.get(0), o = this.#r.get(1);
        for (const r of [
          ...t,
          ...p.iter(this.#n)
        ])
          if ((n & this.#s[r]) === 0n && (o & this.#i[r]) === this.#i[r]) {
            s = r, t.has(r) ? t.delete(r) : p.delete(
              this.#n,
              this.#n.indexOf(r)
            ), this.#r.OR(0, 1n << BigInt(r));
            break;
          }
      }), s > -1 ? (yield s, await navigator.locks.request(this.#a, () => {
        this.#r.XOR(0, 1n << BigInt(s)), this.#r.OR(1, 1n << BigInt(s));
      }), this.#h()) : (e !== 0 || t.size !== 0) && await this.#c();
    }
  }
}
class it {
  queue = /* @__PURE__ */ new Map();
  #e;
  #t;
  #s;
  #i;
  constructor(t, e) {
    this.#e = t, this.#s = new BigUint64Array(1), this.#t = new y({ val: this.#s }, 0, this), this.#i = e;
  }
  spawn() {
    const t = this.#e.spawn();
    return this.#s[0] = t, this.insertInto(t, y), this.#t;
  }
  despawn(t) {
    return this.queue.set(t, 0n), this;
  }
  get(t) {
    return this.#s[0] = t, this.#t;
  }
  insertInto(t, e) {
    this.queue.set(
      t,
      (this.queue.get(t) ?? this.#e.getTableId(t)) | 1n << BigInt(this.#i.indexOf(e))
    );
  }
  removeFrom(t, e) {
    this.queue.set(
      t,
      (this.queue.get(t) ?? this.#e.getTableId(t)) ^ 1n << BigInt(this.#i.indexOf(e))
    );
  }
}
class R {
  static fromWorld(t) {
    const e = t.config.maxEntities;
    return new R(
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(e * 4))
      ),
      new q(
        t.components.length,
        e,
        t.threads.queue(() => new Uint8Array(e))
      ),
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(e * 4))
      ),
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(2 * 4))
      ),
      t.threads.queue(
        () => new Uint32Array(
          t.createBuffer(Math.ceil(e / 8) * 4)
        )
      )
    );
  }
  generations;
  tableIds;
  row;
  #e;
  #t;
  constructor(t, e, s, n, o) {
    this.generations = t, this.tableIds = e, this.row = s, this.#e = n, this.#t = o;
  }
  spawn() {
    for (let e = 0; e < this.#t.length && Atomics.load(this.#e, w.FreeCount) !== 0; e++)
      for (; ; ) {
        const s = Atomics.load(this.#t, e);
        if (s === 0)
          break;
        const n = nt(s);
        if (Atomics.xor(this.#t, e, 1 << n) === s)
          return Atomics.sub(this.#e, w.FreeCount, 1), BigInt(this.generations[n]) << L | BigInt(32 * e + n);
      }
    const t = Atomics.add(this.#e, w.NextId, 1);
    return BigInt(t);
  }
  despawn(t) {
    const e = g(t), s = W(t);
    Atomics.compareExchange(
      this.generations,
      e,
      s,
      s + 1
    ) === s && (Atomics.or(this.#t, e >> 5, 1 << (e & 31)), Atomics.add(this.#e, w.FreeCount, 1));
  }
  getTableId(t) {
    return this.tableIds.get(g(t));
  }
  getRow(t) {
    return this.row[g(t)];
  }
  setLocation(t, e, s) {
    this.tableIds.set(g(t), e), this.row[g(t)] = s;
  }
}
const nt = (i) => (i >>>= 0, 31 - Math.clz32(i & -i));
var w = /* @__PURE__ */ ((i) => (i[i.NextId = 0] = "NextId", i[i.FreeCount = 1] = "FreeCount", i))(w || {});
const rt = (i = {}) => ({
  threads: 1,
  maxEntities: 2 ** 16,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...i
}), ot = ({ threads: i, maxEntities: t }, e) => {
  i > 1 && (m(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), m(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), m(
    e,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), m(
    Number.isInteger(i) && 0 < i && i < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  ), m(
    Number.isInteger(t) && 0 < t && t < 2 ** 32,
    "Invalid config - 'maxEntities' must be an integer such that 0 < maxEntities < 2**32",
    RangeError
  );
};
function at(i, t) {
  const e = rt(i);
  return ot(e, t), e;
}
class ht {
  static new(t, e) {
    return new tt(at(t, e), e);
  }
  archetypes = /* @__PURE__ */ new Map();
  queries = [];
  #e;
  config;
  resources;
  threads;
  systems;
  #t;
  commands;
  entities;
  components;
  constructor(t, e, s, n, o, r, a) {
    this.#e = t.threads > 1 ? SharedArrayBuffer : ArrayBuffer, this.config = t, this.threads = e;
    for (const c in a)
      this.threads.setListener(c, a[c](this));
    this.components = s, this.entities = R.fromWorld(this), this.commands = new it(this.entities, this.components), this.#t = st.fromWorld(this, o, r), this.resources = /* @__PURE__ */ new Map();
    for (const c of n)
      if (N(c)) {
        const d = e.queue(
          () => x(this, c)
        );
        this.resources.set(
          c,
          new c(d, 0, this.commands)
        );
      } else
        e.isMainThread && this.resources.set(c, new c());
    const h = ({ fn: c, parameters: d }) => ({
      execute: c,
      args: d.map((M) => M.intoArgument(this))
    });
    this.systems = o.map(h), this.#t.onReady(() => this.#s());
  }
  moveEntity(t, e) {
    const s = this.entities.getTableId(t), n = this.archetypes.get(s);
    if (e === 0n) {
      this.#i(t);
      return;
    }
    const o = this.#n(e);
    o.isFull && this.#r(e, o), n ? (this.entities.setLocation(
      n.columns.get(y).val[n.size - 1],
      s,
      this.entities.getRow(t)
    ), n.move(this.entities.getRow(t), o)) : o.add(t), this.entities.setLocation(
      t,
      e,
      o.size - 1
    );
  }
  createBuffer(t) {
    return new this.#e(t);
  }
  async update() {
    this.#t.reset(), this.#t.start();
  }
  async #s() {
    for await (const t of this.#t) {
      const e = this.systems[t];
      await e.execute(...e.args);
    }
    this.#t.onReady(() => this.#s());
  }
  #i(t) {
    const e = this.entities.getTableId(t), s = this.archetypes.get(e);
    if (s) {
      const n = this.entities.getRow(t);
      this.entities.setLocation(
        s.columns.get(y)?.val?.[s.size - 1],
        e,
        n
      ), s.delete(this.entities.getRow(t));
    }
    this.entities.setLocation(t, 0n, 0);
  }
  #n(t) {
    if (!this.archetypes.has(t)) {
      const e = v.create(
        this,
        [...S(t)].map((s) => this.components[s])
      );
      this.threads.send("thyseus::newTable", [
        t,
        [...e.columns.values()],
        e.meta
      ]), this.archetypes.set(t, e);
      for (const s of this.queries)
        s.testAdd(t, e);
    }
    return this.archetypes.get(t);
  }
  #r(t, e) {
    e.grow(this), this.threads.send("thyseus::growTable", [
      t,
      [...e.columns.values()],
      e.meta
    ]);
  }
}
function ct(i) {
  return i;
}
export {
  y as Entity,
  ht as World,
  Z as applyCommands,
  ct as definePlugin,
  _ as defineSystem,
  u as struct
};
