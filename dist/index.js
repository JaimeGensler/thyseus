import { DEV as Ct } from "esm-env";
function g(n, t, e = Error) {
  if (Ct && !n)
    throw new e(t);
}
function q(n) {
  return n + 7 & -8;
}
const y = {};
let d, W, f, dt = 0;
const C = 8, z = 4, A = 4, x = 8, mt = 16;
function X() {
  for (; Atomics.compareExchange(f, C >> 2, 0, 1) === 1; )
    ;
}
function P() {
  Atomics.store(f, C >> 2, 0);
}
function It(n, t = !1) {
  if (d)
    return d;
  if (typeof n == "number") {
    const e = t ? SharedArrayBuffer : ArrayBuffer;
    d = new e(q(n));
  } else
    d = n;
  return W = new Uint8Array(d), f = new Uint32Array(d), y.buffer = d, y.u8 = W, y.u16 = new Uint16Array(d), y.u32 = f, y.u64 = new BigUint64Array(d), y.i8 = new Int8Array(d), y.i16 = new Int16Array(d), y.i32 = new Int32Array(d), y.i64 = new BigInt64Array(d), y.f32 = new Float32Array(d), y.f64 = new Float64Array(d), y.dataview = new DataView(d), dt = d.byteLength - 4, typeof n == "number" && (f[1] = d.byteLength - 8, f[f.length - 2] = d.byteLength - 8, R(8)), d;
}
function R(n) {
  const t = q(n), e = x + t;
  let s = C - z;
  for (X(); s < dt; ) {
    const i = f[s >> 2], r = i & -2;
    if (i !== r || r < e) {
      s += r;
      continue;
    }
    const c = r - e >= mt, h = c ? e : r;
    if (f[s >> 2] = h | 1, f[s + h - A >> 2] = h | 1, c) {
      const a = s + e, l = r - e;
      f[a >> 2] = l, f[a + l - A >> 2] = l;
    }
    return P(), s + z;
  }
  throw P(), new Error(`Out of memory (requesting ${n} bytes).`);
}
function pt(n) {
  if (g(
    n % 8 === 0,
    "Invalid pointer in free - pointer was not correctly aligned."
  ), n === C || n === 0)
    return;
  let t = n - z;
  X();
  let e = f[t >> 2] & -2, s = t + e - A;
  if (f[t >> 2] &= -2, f[s >> 2] &= -2, s !== d.byteLength - A) {
    const i = f[t + e >> 2];
    i & 1 || (s += i, e += i);
  }
  if (t !== 0) {
    const i = f[t - A >> 2];
    i & 1 || (t -= i, e += i);
  }
  f[t >> 2] = e, f[s >> 2] = e, W.fill(0, t + z, s - z), P();
}
function $t(n, t) {
  if (g(
    n % 8 === 0,
    "Invalid pointer in realloc - pointer was not correctly aligned."
  ), n === C || n === 0)
    return R(t);
  const e = q(t);
  X();
  const s = n - z, i = f[s >> 2] & -2, r = i - x;
  if (r >= e)
    return P(), n;
  const u = s + i, c = f[u >> 2];
  if (!(c & 1) && c - x >= e - i) {
    const a = e - r, l = c - a >= mt, p = l ? e + x : i + c;
    if (f[u >> 2] = 0, f[u - A >> 2] = 0, f[s >> 2] = p | 1, f[s + p - A >> 2] = p | 1, l) {
      const m = i + c - p;
      f[s + p >> 2] = m, f[s + p + m - A >> 2] = m;
    }
    return P(), n;
  }
  P();
  const h = R(e);
  return K(n, r, h), pt(n), h;
}
function K(n, t, e) {
  W.copyWithin(e, n, n + t);
}
function gt(n, t, e) {
  W.fill(e, n, n + t);
}
function Mt(n) {
  if (n === C || n === 0)
    return C;
  const t = (f[n - z >> 2] & -2) - x, e = R(t);
  return K(n, t, e), e;
}
function Pt() {
  d && (gt(0, d.byteLength, 0), f[1] = d.byteLength - 8, f[f.length - 2] = d.byteLength - 8, R(8));
}
const o = {
  init: It,
  get isInitialized() {
    return d !== void 0;
  },
  alloc: R,
  free: pt,
  realloc: $t,
  copy: K,
  copyPointer: Mt,
  set: gt,
  views: y,
  UNSAFE_CLEAR_ALL: Pt
};
class wt {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get id() {
    return 0n;
  }
  /**
   * Queues a component to be inserted into this entity.
   * @param component The component instance to insert into the entity.
   * @returns `this`, for chaining.
   */
  add(t) {
    return this.#t.insertInto(this.id, t), this;
  }
  /**
   * Queues a component type to be inserted into this entity.
   * @param componentType The component class to insert into the entity.
   * @returns `this`, for chaining.
   */
  addType(t) {
    return this.#t.insertTypeInto(this.id, t), this;
  }
  /**
   * Queues a component to be removed from this entity.
   * @param Component The Component **class** to remove from the entity.
   * @returns `this`, for chaining.
   */
  remove(t) {
    return this.#t.removeFrom(this.id, t), this;
  }
  /**
   * Queues this entity to be despawned.
   * @returns `void`
   */
  despawn() {
    this.#t.despawn(this.id);
  }
}
class at extends wt {
  #t;
  constructor(t, e) {
    super(t), this.#t = e;
  }
  get id() {
    return this.#t;
  }
}
let Q = 0;
function yt(n) {
  g(
    o.isInitialized,
    // Structs require memory to be initialized.
    "Tried to create a struct before memory was initialized."
  ), !n.__$$b && (n.__$$b = Q !== 0 ? Q : o.alloc(n.constructor.size));
}
function tt(n) {
  const t = n.constructor, e = n.__$$b;
  for (const s of t.pointers ?? [])
    o.free(o.views.u32[e + s >> 2]);
  o.free(e);
}
function et(n, t) {
  Q = t;
  const e = new n();
  return Q = 0, e;
}
class v extends wt {
  static size = 8;
  static alignment = 8;
  constructor(t) {
    super(t), yt(this);
  }
  /**
   * The entity's world-unique integer id (uint64).
   * Composed of an entity's generation & index.
   */
  get id() {
    return o.views.u64[this.__$$b >> 3];
  }
  /**
   * The index of this entity (uint32).
   */
  get index() {
    return o.views.u32[this.__$$b >> 2];
  }
  /**
   * The generation of this entity (uint32).
   */
  get generation() {
    return o.views.u32[(this.__$$b >> 2) + 1];
  }
}
class k {
  static createEmptyTable(t) {
    const e = t.threads.queue(() => {
      const i = o.alloc(8);
      return o.views.u32[i >> 2] = 4294967295, o.views.u32[(i >> 2) + 1] = 4294967295, i;
    });
    return new this(t, [], e, 0n, 0);
  }
  static createRecycledTable(t) {
    const e = t.threads.queue(() => {
      const s = t.config.getNewTableSize(0), i = o.alloc(8);
      return o.views.u32[i >> 2] = 0, o.views.u32[(i >> 2) + 1] = s, o.views.u32[(i >> 2) + 2] = o.alloc(
        s * v.size
      ), i;
    });
    return new this(t, [v], e, 0n, 1);
  }
  static create(t, e, s, i) {
    const r = t.config.getNewTableSize(0), u = e.filter(
      (a) => a.size > 0
    ), c = o.alloc(4 * (2 + u.length));
    o.views.u32[(c >> 2) + 1] = r;
    let h = 2;
    for (const a of u)
      o.views.u32[(c >> 2) + h] = o.alloc(
        a.size * r
      ), h++;
    return new this(t, u, c, s, i);
  }
  #t;
  #e;
  #s;
  // [size, capacity, ...componentPointers]
  bitfield;
  #i;
  constructor(t, e, s, i, r) {
    this.#t = t, this.#e = e, this.#s = s, this.bitfield = i, this.#i = r;
  }
  get pointer() {
    return this.#s;
  }
  get id() {
    return this.#i;
  }
  get capacity() {
    return o.views.u32[(this.#s >> 2) + 1];
  }
  get size() {
    return o.views.u32[this.#s >> 2];
  }
  set size(t) {
    o.views.u32[this.#s >> 2] = t;
  }
  getColumn(t) {
    return o.views.u32[(this.#s >> 2) + 2 + this.#e.indexOf(t)];
  }
  hasColumn(t) {
    return this.#e.includes(t);
  }
  delete(t) {
    this.size--;
    let e = 2;
    for (const s of this.#e) {
      const i = o.views.u32[(this.#s >> 2) + e];
      o.copy(
        i + this.size * s.size,
        // From the last element
        s.size,
        // Copy one component
        i + t * s.size
        // To this element
      ), e++;
    }
  }
  move(t, e) {
    e.capacity === e.size && e.grow();
    const { u32: s, u64: i } = o.views;
    if (this.#e[0] !== v)
      return e.size++, BigInt(t);
    const r = this.getColumn(v), u = i[(r >> 3) + this.size];
    for (const c of this.#e) {
      const h = this.getColumn(c) + t * c.size;
      if (e.hasColumn(c))
        o.copy(
          h,
          c.size,
          e.getColumn(c) + e.size * c.size
        );
      else
        for (const a of c.pointers ?? [])
          o.free(s[h + a >> 2]);
    }
    return e.size++, this.delete(t), u;
  }
  grow() {
    o.views.u32[(this.#s >> 2) + 1] = this.#t.config.getNewTableSize(this.capacity);
    let t = 2;
    for (const e of this.#e)
      o.views.u32[(this.#s >> 2) + t] = o.realloc(
        o.views.u32[(this.#s >> 2) + t],
        e.size * this.capacity
      ), t++;
  }
  copyComponentIntoRow(t, e, s) {
    this.hasColumn(e) && o.copy(
      s,
      e.size,
      this.getColumn(e) + t * e.size
    );
  }
}
const Bt = 0x00000000ffffffffn, lt = (n) => Number(n & Bt), U = 256, Lt = 1n << 32n;
class Rt {
  static fromWorld(t) {
    return new this(
      t,
      t.threads.queue(() => {
        const { u32: e } = o.views, s = o.alloc(4 * 4) >> 2;
        return e[s + 2] = o.alloc(8 * U), e[s + 3] = U, s;
      })
    );
  }
  #t;
  #e;
  // [nextId, cursor, locationsPointer, capacity]
  #s;
  constructor(t, e) {
    this.#e = e, this.#t = t, this.#s = t.archetypes[1];
  }
  /**
   * A lockfree method to obtain a new Entity ID
   */
  spawn() {
    const { u32: t, u64: e } = o.views, s = this.#s.size, i = this.#s.getColumn(v);
    for (let r = this.#o(); r < s; r = this.#o())
      if (this.#c(r))
        return e[(i >> 3) + r] + Lt;
    return BigInt(Atomics.add(t, this.#e, 1));
  }
  /**
   * Checks if an entity is currently alive or not.
   * @param entityId The entity id to check
   * @returns `true` if alive, `false` if not.
   */
  isAlive(t) {
    const { u32: e, u64: s } = o.views, i = this.getTableIndex(t), r = this.getRow(t), u = this.#t.archetypes[i].getColumn(v);
    return lt(t) < Atomics.load(e, this.#e) && (i === 0 || i !== 1 || s[(u >> 3) + r] === t);
  }
  resetCursor() {
    const { u32: t } = o.views;
    if (t[this.#e + 1] = 0, t[this.#e] >= this.#n) {
      const e = Math.ceil((t[this.#e] + 1) / U) * U;
      this.#i = o.realloc(
        this.#i,
        e * 8
      ), t[this.#e + 3] = e;
    }
  }
  getTableIndex(t) {
    return o.views.u32[this.#r(t)] ?? 0;
  }
  setTableIndex(t, e) {
    o.views.u32[this.#r(t)] = e;
  }
  getRow(t) {
    return o.views.u32[this.#r(t) + 1] ?? 0;
  }
  setRow(t, e) {
    o.views.u32[this.#r(t) + 1] = e;
  }
  getBitset(t) {
    return this.#t.archetypes[this.getTableIndex(t)].bitfield;
  }
  get #i() {
    return o.views.u32[this.#e + 2];
  }
  set #i(t) {
    o.views.u32[this.#e + 2] = t;
  }
  get #n() {
    return o.views.u32[this.#e + 3];
  }
  set #n(t) {
    o.views.u32[this.#e + 3] = t;
  }
  #r(t) {
    return (this.#i >> 2) + (lt(t) << 1);
  }
  /**
   * Atomically grabs the current cursor.
   * @returns The current cursor value.
   */
  #o() {
    return Atomics.load(o.views.u32, this.#e + 1);
  }
  /**
   * Tries to atomically move the cursor by one.
   * @param expected The value the cursor is currently expected to be.
   * @returns A boolean, indicating if the move was successful or not.
   */
  #c(t) {
    return t === Atomics.compareExchange(
      o.views.u32,
      this.#e + 1,
      t,
      t + 1
    );
  }
}
const G = 0, B = 1, vt = 2;
class xt {
  static fromWorld(t) {
    const e = t.threads.queue(() => {
      const i = t.components.reduce(
        (c, h) => c + h.size,
        0
      ), r = [];
      let u = o.alloc(i);
      for (const c of t.components) {
        if (r.push(u), c.size === 0)
          continue;
        const h = new c();
        o.copy(h.__$$b, c.size, u), o.free(h.__$$b), u += c.size;
      }
      return r;
    }), s = t.threads.queue(
      () => o.alloc((1 + 3 * t.config.threads) * 4)
    );
    return new this(t, e, s);
  }
  #t = { type: 0, dataStart: 0, dataSize: 0 };
  #e;
  #s;
  #i;
  #n;
  // [nextId, ...[size, capacity, pointer]]
  #r;
  constructor(t, e, s) {
    this.#e = t.entities, this.#s = t.components, this.#i = e, this.#n = s >> 2, this.#r = 3 * Atomics.add(o.views.u32, this.#n, 1) + this.#n + 1;
  }
  get #o() {
    return o.views.u32[this.#r];
  }
  set #o(t) {
    o.views.u32[this.#r] = t;
  }
  get #c() {
    return o.views.u32[this.#r + 1];
  }
  set #c(t) {
    o.views.u32[this.#r + 1] = t;
  }
  get #u() {
    return o.views.u32[this.#r + 2];
  }
  set #u(t) {
    o.views.u32[this.#r + 2] = t;
  }
  /**
   * Queues an entity to be spawned.
   * @returns `EntityCommands`, which can add/remove components from an entity.
   */
  spawn() {
    const t = this.#e.spawn(), e = this.#h(
      B,
      t,
      v
    );
    return o.views.u64[e >> 3] = t, new at(this, t);
  }
  /**
   * Queues an entity to be despawned.
   * @param id The id of the entity to despawn.
   * @returns `this`, for chaining.
   */
  despawn(t) {
    this.#h(G, t, v);
  }
  /**
   * Gets `EntityCommands` for an Entity.
   * @param id The id of the entity to get.
   * @returns `EntityCommands`, which can add/remove components from an entity.
   */
  getEntityById(t) {
    return new at(this, t);
  }
  insertInto(t, e) {
    const s = e.constructor;
    g(
      s !== v,
      "Tried to add Entity component, which is forbidden."
    );
    const i = this.#h(
      B,
      t,
      s
    );
    s.size !== 0 && (o.copy(e.__$$b, s.size, i), this.#a(s, i));
  }
  insertTypeInto(t, e) {
    g(
      e !== v,
      "Tried to add Entity component, which is forbidden."
    );
    const s = this.#h(
      B,
      t,
      e
    );
    e.size !== 0 && (o.copy(
      this.#i[this.#s.indexOf(e)],
      e.size,
      s
    ), this.#a(e, s));
  }
  removeFrom(t, e) {
    g(
      e !== v,
      "Tried to remove Entity component, which is forbidden."
    ), this.#h(
      G,
      t,
      e
    );
  }
  *[Symbol.iterator]() {
    const { u32: t } = o.views, e = 1 + t[this.#n] * 3;
    for (let s = 1; s < e; s += 3) {
      const i = t[this.#n + s + 2], r = i + t[this.#n + s];
      for (let u = i; u < r; u += t[u >> 2])
        this.#t.type = t[u + 4 >> 2], this.#t.dataSize = t[u >> 2] - 8, this.#t.dataStart = u + 8, yield this.#t;
    }
  }
  pushCommand(t, e) {
    const s = 8 + q(t);
    let i = this.#o + s;
    this.#c < i && (i <<= 1, this.#u = o.realloc(this.#u, i), this.#c = i);
    const r = this.#u + this.#o;
    return o.views.u32[r >> 2] = s, o.views.u32[r + 4 >> 2] = e, this.#o += s, r + 8;
  }
  reset() {
    const { u32: t } = o.views, e = 1 + t[this.#n] * 3;
    for (let s = 1; s < e; s += 3)
      t[this.#n + s] = 0;
  }
  #h(t, e, s) {
    g(
      this.#s.includes(s),
      `Tried to add/remove unregistered component (${s.name}) on an Entity.`
    );
    const i = this.pushCommand(
      16 + q(t * s.size),
      t
    );
    return o.views.u64[i >> 3] = e, o.views.u16[i + 8 >> 1] = this.#s.indexOf(s), i + 16;
  }
  #a(t, e) {
    for (const s of t.pointers ?? [])
      o.views.u32[e + s >> 2] = o.copyPointer(
        o.views.u32[e + s >> 2]
      );
  }
}
class Ot {
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
class qt {
  #t = [];
  #e = [];
  #s;
  #i;
  #n;
  #r;
  #o;
  constructor(t, e, s, i, r) {
    this.#s = t, this.#i = e, this.#r = s, this.#n = i, this.#o = r.commands;
  }
  /**
   * The number of entities that match this query.
   */
  get length() {
    return this.#t.reduce((t, e) => t + e.size, 0);
  }
  *[Symbol.iterator]() {
    let t;
    const e = this.#c();
    for (const s of this.#t)
      if (s.size !== 0) {
        for (let i = 0; i < e.length; i++) {
          const r = e[i] ?? t[i], u = s.hasColumn(r.constructor);
          !u && e[i] !== null ? (t ??= [], t[i] = e[i], e[i] = null) : u && (e[i] === null && (e[i] = t[i], t[i] = null), r.__$$b = s.getColumn(r.constructor));
        }
        for (let i = 0; i < s.size; i++) {
          yield this.#r ? e[0] : e;
          for (const r of e)
            r && (r.__$$b += r.constructor.size);
        }
      }
    if (t)
      for (let s = 0; s < t.length; s++)
        t[s] && (e[s] = t[s]);
    this.#e.push(e);
  }
  forEach(t) {
    if (this.#r)
      for (const e of this)
        t(e);
    else
      for (const e of this)
        t(...e);
  }
  #c() {
    return this.#e.pop() ?? this.#n.map((t) => {
      const e = t === v ? new t(this.#o) : new t();
      return tt(e), e;
    });
  }
  testAdd(t, e) {
    this.#u(t) && this.#t.push(e);
  }
  #u(t) {
    for (let e = 0; e < this.#s.length; e++)
      if ((this.#s[e] & t) === this.#s[e] && (this.#i[e] & t) === 0n)
        return !0;
    return !1;
  }
}
class Y {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class $ {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class st {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class it {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class nt {
  #t;
  #e;
  constructor(t, e) {
    this.#t = t, this.#e = e;
  }
  get l() {
    return this.#t;
  }
  get r() {
    return this.#e;
  }
}
const H = (n, t, e = []) => (Array.isArray(t) ? t : [t]).reduce(
  (s, i, r) => e[r] ? s : s | 1n << BigInt(n.indexOf(i)),
  0n
);
function L(n, t, e) {
  let s = e;
  for (const i of Array.isArray(n) ? n : [n])
    s = t(s, i);
  return s;
}
function Wt(n, t) {
  L(t, function e(s, i) {
    i instanceof st || i instanceof it ? (i.value instanceof Array ? i.value : [i.value]).forEach((u) => n.registerComponent(u)) : i instanceof nt && (L(i.l, e), L(i.r, e));
  });
}
function Nt(n, t, e, s) {
  const i = L(
    s,
    function u(c, h) {
      if (h instanceof st) {
        const a = H(
          n,
          h.value
        );
        return {
          withs: c.withs.map((l) => l | a),
          withouts: c.withouts
        };
      } else if (h instanceof it) {
        const a = H(
          n,
          h.value
        );
        return {
          withs: c.withs,
          withouts: c.withouts.map((l) => l | a)
        };
      } else if (h instanceof nt) {
        const a = L(h.l, u, c), l = L(h.r, u, c);
        return {
          withs: [...a.withs, ...l.withs],
          withouts: [...a.withouts, ...l.withouts]
        };
      }
      throw new Error(
        `Unrecognized filter (${h.constructor.name}) in Query.`
      );
    },
    {
      withs: [
        H(n, t, e)
      ],
      withouts: [0n]
    }
  ), r = i.withs.reduce(
    (u, c, h) => (i.withs[h] & i.withouts[h]) === 0n ? u.add(h) : u,
    /* @__PURE__ */ new Set()
  );
  return i.withs = i.withs.filter((u, c) => r.has(c)), i.withouts = i.withouts.filter((u, c) => r.has(c)), g(
    i.withs.length > 0,
    "Tried to construct a query that cannot match any entities."
  ), i;
}
class rt {
  components = [];
  writes = [];
  optionals = [];
  filters;
  isIndividual;
  constructor(t, e = []) {
    this.isIndividual = !Array.isArray(t);
    const s = Array.isArray(t) ? t : [t];
    for (const i of s) {
      const r = i instanceof $ || i instanceof Y && i.value instanceof $;
      this.writes.push(r), this.optionals.push(i instanceof Y);
      const u = i instanceof $ ? i.value : i instanceof Y ? i.value instanceof $ ? i.value.value : i.value : i;
      g(
        u.size > 0,
        "You may not request direct access to ZSTs - use a With filter instead."
      ), this.components.push(u);
    }
    this.filters = e;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof rt ? this.components.some(
      (e, s) => t.components.some(
        (i, r) => e === i && (this.writes[s] || t.writes[r])
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e)), Wt(t, this.filters);
  }
  intoArgument(t) {
    const { withs: e, withouts: s } = Nt(
      t.components,
      this.components,
      this.optionals,
      this.filters
    ), i = new qt(
      e,
      s,
      this.isIndividual,
      this.components,
      t
    );
    return t.queries.push(i), i;
  }
}
const Et = {
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
let M = 1, V = 0;
const T = [], I = [];
let _ = {}, J = {};
const Dt = (n, t, e) => {
  const s = I.reduce(
    (r, u, c) => u < t && c < r ? c : r,
    I.length
  );
  if (s === I.length) {
    T.push(n), I.push(t), _[n] = T.length === 0 ? 0 : V;
    return;
  }
  const i = T[s];
  T.splice(s, 0, n), I.splice(s, 0, t), _[n] = _[i];
  for (let r = s + 1; r < T.length; r++)
    _[T[r]] += e;
};
function N(n, t, e, s) {
  return M = Math.max(M, t), s && (J[n] = s), Dt(n, t, e), V += e, _;
}
function Ut() {
  const n = [];
  for (const e in J)
    for (const s of J[e])
      n.push(s + _[e]);
  const t = {
    size: Math.ceil(V / M) * M,
    alignment: M,
    pointers: n
  };
  return V = 0, M = 1, _ = {}, T.length = 0, I.length = 0, t;
}
function b(n) {
  return function(e, s) {
    const i = Et[n], r = N(
      s,
      i.BYTES_PER_ELEMENT,
      i.BYTES_PER_ELEMENT
    ), u = 31 - Math.clz32(i.BYTES_PER_ELEMENT);
    Object.defineProperty(e, s, {
      enumerable: !0,
      get() {
        return o.views[n][this.__$$b + r[s] >> u];
      },
      set(c) {
        o.views[n][this.__$$b + r[s] >> u] = c;
      }
    });
  };
}
const Ft = b("u8"), kt = b("u16"), Yt = b("u32"), Qt = b("u64"), Vt = b("i8"), Zt = b("i16"), jt = b("i32"), Ht = b("i64"), Gt = b("f32"), Jt = b("f64"), Xt = function(t, e) {
  const s = N(
    e,
    Uint8Array.BYTES_PER_ELEMENT,
    Uint8Array.BYTES_PER_ELEMENT
  );
  Object.defineProperty(t, e, {
    enumerable: !0,
    get() {
      return !!o.views.u8[this.__$$b + s[e]];
    },
    set(i) {
      o.views.u8[this.__$$b + s[e]] = Number(i);
    }
  });
};
function Kt(n) {
  let t = n.length;
  for (let e = n.length - 1; e >= 0; e--) {
    const s = n.charCodeAt(e);
    s > 127 && s <= 2047 ? t++ : s > 2047 && s <= 65535 && (t += 2), s >= 56320 && s <= 57343 && e--;
  }
  return t;
}
const te = new TextEncoder(), ee = new TextDecoder();
function se(n, t) {
  const e = N(
    t,
    Uint32Array.BYTES_PER_ELEMENT,
    Uint32Array.BYTES_PER_ELEMENT * 3,
    [8]
  );
  Object.defineProperty(n, t, {
    enumerable: !0,
    get() {
      const s = this.__$$b + e[t], i = o.views.u32[s >> 2], r = o.views.u32[s + 8 >> 2];
      return ee.decode(o.views.u8.subarray(r, r + i));
    },
    set(s) {
      const i = Kt(s), r = this.__$$b + e[t], u = o.views.u32[r + 4 >> 2];
      let c = o.views.u32[r + 8 >> 2];
      if (u < i) {
        const h = o.realloc(c, i);
        c = h, o.views.u32[r + 4 >> 2] = i, o.views.u32[r + 8 >> 2] = h;
      }
      o.views.u32[r >> 2] = i, te.encodeInto(
        s,
        o.views.u8.subarray(c, c + i)
      );
    }
  });
}
function ie({ type: n, length: t }) {
  return function(s, i) {
    const r = Et[n], u = N(
      i,
      r.BYTES_PER_ELEMENT,
      r.BYTES_PER_ELEMENT * t
    ), c = 31 - Math.clz32(r.BYTES_PER_ELEMENT);
    Object.defineProperty(s, i, {
      enumerable: !0,
      get() {
        return o.views[n].subarray(
          this.__$$b + u[i] >> c,
          (this.__$$b + u[i] >> c) + t
        );
      },
      set(h) {
        o.views[n].set(
          h.subarray(0, t),
          this.__$$b + u[i] >> c
        );
      }
    });
  };
}
function ne(n) {
  return function(e, s) {
    const i = N(
      s,
      n.alignment,
      n.size,
      n.pointers
    );
    Object.defineProperty(e, s, {
      enumerable: !0,
      get() {
        return et(
          n,
          this.__$$b + i[s]
        );
      },
      set(r) {
        o.copy(r.__$$b, n.size, this.__$$b);
      }
    });
  };
}
function w(n) {
  const { size: t, alignment: e, pointers: s } = Ut();
  return class extends n {
    static size = t;
    static alignment = e;
    static pointers = s;
    constructor(...i) {
      super(...i), yt(this);
    }
  };
}
w.bool = Xt;
w.u8 = Ft;
w.u16 = kt;
w.u32 = Yt;
w.u64 = Qt;
w.i8 = Vt;
w.i16 = Zt;
w.i32 = jt;
w.i64 = Ht;
w.f32 = Gt;
w.f64 = Jt;
w.string = se;
w.array = ie;
w.substruct = ne;
function Z(n) {
  return typeof n == "function" && //@ts-ignore
  typeof n.size == "number" && //@ts-ignore
  typeof n.alignment == "number";
}
class ot {
  resource;
  canWrite;
  constructor(t) {
    const e = t instanceof $;
    this.resource = e ? t.value : t, this.canWrite = e;
  }
  isLocalToThread() {
    return !Z(this.resource);
  }
  intersectsWith(t) {
    return t instanceof ot ? this.resource === t.resource && (this.canWrite || t.canWrite) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.find(
      (e) => e.constructor === this.resource
    );
  }
}
class re {
  resourceType;
  constructor(t) {
    this.resourceType = t;
  }
  isLocalToThread() {
    return !Z(this.resourceType);
  }
  intersectsWith(t) {
    return !1;
  }
  onAddSystem(t) {
  }
  async intoArgument({ threads: t }) {
    const { resourceType: e } = this, s = Z(e) ? et(
      e,
      e.size !== 0 ? t.queue(() => o.alloc(e.size)) : 0
    ) : new e();
    return t.isMainThread && await s.initialize?.(), s;
  }
}
class bt {
  #t;
  #e;
  #s;
  #i;
  // [length, capacity, pointerStart, ...defaultData]
  constructor(t, e, s, i) {
    i === void 0 && (i = new e(), tt(i)), this.#t = t, this.#s = i, this.#e = e, this.#i = s >> 2;
  }
  /**
   * The event type (struct) for this queue.
   */
  get type() {
    return this.#e;
  }
  /**
   * The number of events currently in this queue.
   */
  get length() {
    return o.views.u32[this.#i];
  }
  *[Symbol.iterator]() {
    const t = this.#e.size;
    this.#s.__$$b = o.views.u32[this.#i + 2];
    for (let e = 0; e < this.length; e++)
      yield this.#s, this.#s.__$$b += t;
  }
  /**
   * Sets this event queue to be cleared when commands are next processed.
   */
  clear() {
    const t = this.#t.pushCommand(4, vt);
    o.views.u32[t >> 2] = this.#i << 2;
  }
}
class oe extends bt {
  #t;
  #e;
  // [length, capacity, pointerStart, ...defaultData]
  constructor(t, e, s) {
    const i = new e();
    tt(i), super(t, e, s, i), this.#t = i, this.#e = s >> 2;
  }
  /**
   * Creates a new event and returns a mutable instance of that event.
   * Returned instance will be reused.
   *
   * @returns A mutable instance of the event.
   */
  create() {
    const t = this.#s();
    return this.#t.__$$b = t, o.copy(this.#e + 3 << 2, this.type.size, t), this.#t;
  }
  /**
   * Creates an event on the queue from a passed instance of a struct.
   * @param instance The event to add to the event queue.
   */
  createFrom(t) {
    o.copy(t.__$$b, this.type.size, this.#s());
  }
  /**
   * Creates an event with the default data for that event.
   */
  createDefault() {
    o.copy(
      this.#e + 3 << 2,
      this.type.size,
      this.#s()
    );
  }
  /**
   * **Immediately** clears all events in this queue.
   */
  clearImmediate() {
    o.views.u32[this.#e] = 0;
  }
  /**
   * Increments length, returns a pointer to the new event (in queue).
   * Will grow queue, if necessary.
   */
  #s() {
    const { length: t } = this;
    return t === o.views.u32[this.#e + 1] && this.type.size !== 0 && (o.views.u32[this.#e + 2] = o.realloc(
      o.views.u32[this.#e + 2],
      t * this.type.size + 8 * this.type.size
    ), o.views.u32[this.#e + 1] += 8), o.views.u32[this.#e]++, t * this.type.size + o.views.u32[this.#e + 2];
  }
}
class At {
  eventType;
  constructor(t) {
    this.eventType = t;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof j && t.eventType === this.eventType;
  }
  onAddSystem(t) {
    t.registerEvent(this.eventType);
  }
  intoArgument(t) {
    return t.eventReaders.find((e) => e.type === this.eventType);
  }
}
class j {
  eventType;
  constructor(t) {
    this.eventType = t;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return (t instanceof j || t instanceof At) && t.eventType === this.eventType;
  }
  onAddSystem(t) {
    t.registerEvent(this.eventType);
  }
  intoArgument(t) {
    return t.eventWriters.find((e) => e.type === this.eventType);
  }
}
class ce {
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
function E(n) {
  return (...t) => new n(...t);
}
const ue = {
  Commands: E(Ot),
  Query: E(rt),
  Res: E(ot),
  World: E(ce),
  SystemRes: E(re),
  Mut: E($),
  Optional: E(Y),
  With: E(st),
  Without: E(it),
  EventReader: E(At),
  EventWriter: E(j),
  Or(n, t) {
    return new nt(n, t);
  }
};
class ct {
  #t = 0;
  #e = [];
  #s;
  fn;
  constructor(t, e) {
    this.#s = t, this.fn = e;
  }
  get parameters() {
    return this.#s(ue);
  }
  before(...t) {
    for (const e of t)
      e.after(this);
    return this;
  }
  after(...t) {
    for (const e of t)
      this.#e.push(e);
    return this;
  }
  beforeAll() {
    return this.#t = -1, this;
  }
  afterAll() {
    return this.#t = 1, this;
  }
  clone() {
    return new ct(this.#s, this.fn);
  }
  getAndClearDependencies() {
    const t = {
      dependencies: this.#e,
      implicitPosition: this.#t
    };
    return this.#e = [], this.#t = 0, t;
  }
}
function he(n, t) {
  return new ct(n, t);
}
const Tt = he(
  ({ World: n, SystemRes: t }) => [n(), t(Map)],
  function(t, e) {
    const { commands: s, entities: i, archetypes: r, components: u } = t;
    i.resetCursor(), e.clear();
    for (const { type: c, dataStart: h } of s) {
      if (c === vt) {
        const m = o.views.u32[h >> 2];
        o.views.u32[m >> 2] = 0;
      }
      if (c !== B && c !== G)
        continue;
      const a = o.views.u64[h >> 3];
      let l = e.get(a);
      if (l === 0n)
        continue;
      const p = o.views.u16[h + 8 >> 1];
      l ??= i.getBitset(a), e.set(
        a,
        c === B ? l | 1n << BigInt(p) : p === 0 ? 0n : l ^ 1n << BigInt(p)
      );
    }
    for (const [c, h] of e)
      t.moveEntity(c, h);
    for (const { type: c, dataStart: h } of s) {
      if (c !== B)
        continue;
      const a = o.views.u64[h >> 3], l = i.getTableIndex(a);
      if (l === 0 || l === 1)
        continue;
      const p = o.views.u32[h + 8 >> 2];
      r[l].copyComponentIntoRow(
        i.getRow(a),
        u[p],
        h + 16
      );
    }
    s.reset();
  }
);
function* S(n) {
  let t = 0;
  for (; n !== 0n; )
    (n & 1n) === 1n && (yield t), n >>= 1n, t++;
}
let ae = 1;
function le(n, t) {
  function e(...s) {
    return [n, ae++, s];
  }
  return e.channelName = n, e.onReceive = t, e;
}
class O {
  static isMainThread = !!globalThis.document;
  isMainThread = O.isMainThread;
  static spawn(t, e) {
    return new this(
      O.isMainThread ? Array.from(
        { length: t },
        () => new Worker(e, { type: "module" })
      ) : [globalThis]
    );
  }
  #t = /* @__PURE__ */ new Map();
  #e = /* @__PURE__ */ new Map();
  #s = {};
  #i = [];
  #n;
  constructor(t) {
    this.#n = t;
    const e = ({
      currentTarget: s,
      data: [i, r, u]
    }) => {
      if (this.#t.has(r)) {
        const c = this.#e.get(r);
        c.push(u), c.length === this.#n.length && (this.#t.get(r)(c), this.#t.delete(r), this.#e.delete(r));
      } else
        i in this.#s ? s.postMessage([
          i,
          r,
          this.#s[i](...u)
        ]) : s.postMessage([i, r, null]);
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
  /**
   * Sends a value to a channel.
   * @param channel The channel to send the value to.
   * @param message The value to send.
   * @returns A promise, resolves to an array of results from all threads.
   */
  send(t) {
    return this.#n.length === 0 ? Promise.resolve([]) : new Promise((e) => {
      for (const s of this.#n)
        s.postMessage(t);
      this.#e.set(t[1], []), this.#t.set(t[1], e);
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
  queue(t) {
    if (O.isMainThread) {
      const e = t();
      return this.#i.push(e), e;
    }
    return this.#i.shift();
  }
  async wrapInQueue(t) {
    const e = "threadGroup::queue";
    let s;
    return this.isMainThread ? (s = await t(), await this.send([e, 0, [this.#i]])) : (s = await new Promise(
      (i) => this.setListener(e, (r) => {
        this.#i = r, i(t());
      })
    ), this.deleteListener(e)), this.#i.length = 0, s;
  }
}
const _t = le(
  "thyseus::sendTable",
  (n) => (t, e, s) => {
    const i = [...S(s)].reduce((u, c) => {
      const h = n.components[c];
      return h.size > 0 && u.push(h), u;
    }, []), r = new k(n, i, t, s, e);
    n.archetypes[e] = r;
    for (const u of n.queries)
      u.testAdd(s, r);
  }
);
function fe(n) {
  n.registerComponent(v).addSystem(Tt.afterAll()).registerThreadChannel(_t);
}
function de(n, t) {
  return n.parameters.some(
    (e) => t.parameters.some(
      (s) => e.intersectsWith(s) || s.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function zt(n) {
  return n.map(
    (t) => n.reduce(
      (e, s, i) => e | BigInt(de(t, s)) << BigInt(i),
      0n
    )
  );
}
function St(n, t, e) {
  const s = t.map(
    (r) => r.dependencies.reduce((u, c) => {
      const h = n.indexOf(c);
      return h === -1 ? u : u | 1n << BigInt(h);
    }, 0n)
  ), i = [...s];
  i.forEach(function r(u, c) {
    for (const h of S(u))
      r(i[h], h), i[c] |= i[h];
  });
  for (let r = 0; r < i.length; r++)
    g(
      (i[r] & 1n << BigInt(r)) === 0n,
      `Circular Dependency Detected - Sytem #${r} (${n[r].fn.name}) depends on itself!`
    );
  for (let r = 0; r < n.length; r++) {
    const u = t[r];
    if (u.implicitPosition === -1)
      for (const c of S(e[r]))
        c !== r && (i[r] & 1n << BigInt(c)) === 0n && (s[c] |= 1n << BigInt(r), i[c] |= 1n << BigInt(r));
    else if (u.implicitPosition === 1)
      for (const c of S(e[r]))
        c !== r && (i[c] & 1n << BigInt(r)) === 0n && (s[r] |= 1n << BigInt(c), i[r] |= 1n << BigInt(c));
  }
  return s.forEach((r, u) => s[u] &= e[u]), s;
}
function ft(n, t, e) {
  for (const s of S(t))
    if (n[s] === e)
      return !1;
  return !0;
}
let me = 0;
const F = (...n) => {
};
class pe {
  static fromWorld(t, e, s) {
    const i = t.threads.queue(
      () => zt(e)
    ), r = t.threads.queue(
      () => St(e, s, i)
    ), u = t.threads.isMainThread ? e.map(() => !0) : e.map((l) => !l.parameters.some((p) => p.isLocalToThread())), { buffer: c } = o.views, h = t.threads.queue(
      () => o.alloc(8 + e.length * 3)
    ), a = t.threads.queue(
      () => `thyseus::ParallelExecutor${me++}`
    );
    return new this(
      t,
      new Uint32Array(c, h, 2),
      new Uint8Array(c, h + 8, e.length),
      new Uint8Array(
        c,
        h + 8 + e.length,
        e.length
      ),
      new Uint8Array(
        c,
        h + 8 + e.length * 2,
        e.length
      ),
      i,
      r,
      u,
      a
    );
  }
  #t = F;
  #e = F;
  #s;
  #i;
  #n;
  #r;
  #o;
  #c;
  #u;
  #h;
  #a;
  #d;
  #l;
  #m;
  constructor(t, e, s, i, r, u, c, h, a) {
    this.#l = t.systems, this.#m = t.arguments, this.#d = t.threads.isMainThread, this.#c = u, this.#u = c, this.#o = h, this.#s = e, this.#i = s, this.#n = i, this.#r = r, this.#a = new BroadcastChannel(a), this.#h = a, this.#a.addEventListener(
      "message",
      ({ data: l }) => {
        l === 0 ? this.#p() : l === 1 ? (this.#t(), this.#t = F) : (this.#e(), this.#e = F);
      }
    );
  }
  async start() {
    return this.#f = this.#l.length, this.#s[1] = 0, this.#i.fill(1), this.#r.fill(0), this.#n.fill(0), this.#g(), this.#p();
  }
  get #f() {
    return this.#s[0];
  }
  set #f(t) {
    this.#s[0] = t;
  }
  async #p() {
    for (; this.#f > 0; ) {
      let t = -1;
      if (await navigator.locks.request(this.#h, () => {
        t = this.#i.findIndex(
          (e, s) => !!e && ft(this.#r, this.#u[s], 0) && ft(this.#n, this.#c[s], 1) && this.#o[s]
        ), t !== -1 && (this.#i[t] = 0, this.#n[t] = 1, this.#f--);
      }), t === -1) {
        await this.#y();
        continue;
      }
      await this.#l[t](...this.#m[t]), await navigator.locks.request(this.#h, () => {
        this.#n[t] = 0, this.#r[t] = 1, Atomics.add(this.#s, 1, 1);
      }), this.#w();
    }
    this.#d && Atomics.load(this.#s, 1) !== this.#l.length && await this.#v();
  }
  #g() {
    this.#a.postMessage(0);
  }
  #w() {
    Atomics.load(this.#s, 1) === this.#l.length ? this.#a.postMessage(2) : this.#a.postMessage(1);
  }
  async #y() {
    return new Promise((t) => this.#t = t);
  }
  async #v() {
    return new Promise((t) => this.#e = t);
  }
}
class ge {
  static fromWorld(t, e, s) {
    const i = St(
      e,
      s,
      zt(e)
    ), r = i.reduce(function u(c, h, a) {
      for (const l of S(h))
        u(c, i[l], l);
      return c.includes(a) || c.push(a), c;
    }, []);
    return new this(t, r);
  }
  #t;
  #e;
  #s;
  constructor(t, e) {
    this.#t = t.systems, this.#e = t.arguments, this.#s = e;
  }
  async start() {
    for (const t of this.#s)
      await this.#t[t](...this.#e[t]);
  }
}
class we {
  systems = [];
  #t = [];
  #e = [];
  components = /* @__PURE__ */ new Set();
  resources = /* @__PURE__ */ new Set();
  events = /* @__PURE__ */ new Set();
  threadChannels = [];
  executor;
  config;
  url;
  constructor(t, e) {
    this.config = t, this.url = e, this.executor = t.threads > 1 ? pe : ge, fe(this);
  }
  /**
   * Adds a system to the world and processes its parameter descriptors.
   * @param system The system to add.
   * @param dependencies The dependencies of this system.
   * @returns `this`, for chaining.
   */
  addSystem(t) {
    return this.systems.push(t), this.#t.push(t.getAndClearDependencies()), t.parameters.forEach((e) => e.onAddSystem(this)), this;
  }
  /**
   * Adds a system to the world _**that will only be run once when built**_.
   * @param system The system to add.
   * @returns `this`, for chaining.
   */
  addStartupSystem(t) {
    return this.#e.push(t), t.parameters.forEach((e) => e.onAddSystem(this)), this;
  }
  /**
   * Passes this WorldBuilder to the provided plugin function.
   * @param plugin The plugin to pass this WorldBuilder to.
   * @returns `this`, for chaining.
   */
  addPlugin(t) {
    return t(this), this;
  }
  /**
   * Registers a Component in the world. Called automatically for all queried components when a system is added.
   * @param componentType The componentType (`Struct`) to register.
   * @returns `this`, for chaining.
   */
  registerComponent(t) {
    return this.components.add(t), this;
  }
  /**
   * Registers a Resource in the world. Called automatically for all accessed resources when a system is added.
   * @param resourceType The Resource type (`Class`) to register.
   * @returns `this`, for chaining.
   */
  registerResource(t) {
    return this.resources.add(t), this;
  }
  /**
   * Registers an event type in the world. Called automatically for all event readers/writers when a system is added.
   * @param resourceType The Event type (`Struct`) to register.
   * @returns `this`, for chaining.
   */
  registerEvent(t) {
    return this.events.add(t), this;
  }
  /**
   * Registers a message channel for threads. When a thread receives a message, it will run the callback created by `listenerCreator`.
   * @param channel The **_unique_** name of the channel. _NOTE: Calling this method again with the same channel will override the previous listener!_
   * @param listenerCreator A creator function that will be called with the world when built. Should return a function that receives whatever data that is sent across threads, and returns data to be sent back.
   * @returns `this`, for chaining.
   */
  registerThreadChannel(t) {
    return this.threadChannels.push(t), this;
  }
  /**
   * Sets the Executor that this world will use.
   * @param executor The Executor to use.
   * @returns `this`, for chaining.
   */
  setExecutor(t) {
    return this.executor = t, this;
  }
  /**
   * Builds the world.
   * `World` instances cannot add new systems or register new types.
   * @returns `Promise<World>`
   */
  async build() {
    const t = O.spawn(this.config.threads - 1, this.url), e = await t.wrapInQueue(
      () => new Ae(
        this.config,
        t,
        this.executor,
        [...this.components],
        [...this.resources],
        [...this.events],
        this.systems,
        this.#t,
        this.threadChannels
      )
    );
    for (const s of this.systems)
      e.systems.push(s.fn), e.arguments.push(
        await Promise.all(
          s.parameters.map((i) => i.intoArgument(e))
        )
      );
    if (t.isMainThread) {
      await Promise.all(
        //@ts-ignore
        e.resources.map((s) => s.initialize?.(e))
      );
      for (const s of this.#e)
        await s.fn(
          ...s.parameters.map((i) => i.intoArgument(e))
        );
      await Tt.fn(e, /* @__PURE__ */ new Map());
    }
    return e;
  }
}
const ye = 1048576, ve = (n = {}) => ({
  threads: 1,
  memory: 512 * ye,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...n
}), Ee = ({ threads: n, memory: t }, e) => {
  n > 1 && (g(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), g(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), g(
    e,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), g(
    Number.isInteger(n) && 0 < n && n < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  ), g(
    Number.isInteger(t) && t < 2 ** 32,
    "Invalid config - 'memory' must be at most 4 GB ((2**32) - 1 bytes)"
  );
};
function be(n, t) {
  const e = ve(n);
  return Ee(e, t), e;
}
class Ae {
  static new(t, e) {
    return new we(be(t, e), e);
  }
  archetypes = [];
  #t = /* @__PURE__ */ new Map();
  queries = [];
  resources = [];
  eventReaders = [];
  eventWriters = [];
  systems = [];
  arguments = [];
  commands;
  entities;
  config;
  threads;
  executor;
  components;
  constructor(t, e, s, i, r, u, c, h, a) {
    this.config = t, this.threads = e, o.init(
      this.threads.queue(
        () => o.init(t.memory, t.threads > 1)
      )
    );
    const l = k.createEmptyTable(this), p = k.createRecycledTable(this);
    this.archetypes.push(l, p), this.#t.set(0n, p);
    for (const m of a)
      this.threads.setListener(
        m.channelName,
        m.onReceive(this)
      );
    this.components = i, this.entities = Rt.fromWorld(this), this.commands = xt.fromWorld(this), this.executor = s.fromWorld(this, c, h);
    for (const m of u) {
      const D = this.threads.queue(() => {
        const ut = o.alloc(12 + m.size);
        if (m.size !== 0) {
          const ht = new m();
          o.copy(ht.__$$b, m.size, ut + 12), o.free(ht.__$$b);
        }
        return ut;
      });
      this.eventReaders.push(
        new bt(this.commands, m, D)
      ), this.eventWriters.push(
        new oe(this.commands, m, D)
      );
    }
    for (const m of r)
      if (Z(m)) {
        const D = this.threads.queue(
          () => m.size !== 0 ? o.alloc(m.size) : 0
        );
        this.resources.push(et(m, D));
      } else
        e.isMainThread && this.resources.push(new m());
  }
  async update() {
    return this.executor.start();
  }
  moveEntity(t, e) {
    if (!this.entities.isAlive(t))
      return;
    const s = this.archetypes[this.entities.getTableIndex(t)], i = this.#e(e), r = this.entities.getRow(t), u = s.move(r, i);
    this.entities.setRow(u, r), this.entities.setTableIndex(t, i.id), this.entities.setRow(t, i.size - 1);
  }
  #e(t) {
    let e = this.#t.get(t);
    if (e)
      return e;
    const s = this.archetypes.length;
    e = k.create(
      this,
      Array.from(S(t), (i) => this.components[i]),
      t,
      s
    ), this.#t.set(t, e), this.archetypes.push(e), this.threads.send(_t(e.pointer, s, t));
    for (const i of this.queries)
      i.testAdd(t, e);
    return e;
  }
}
function _e(n) {
  return n;
}
export {
  v as Entity,
  Ae as World,
  Tt as applyCommands,
  le as createThreadChannel,
  _e as definePlugin,
  he as defineSystem,
  tt as dropStruct,
  yt as initStruct,
  w as struct
};
