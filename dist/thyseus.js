import { DEV as _ } from "esm-env";
function w(n, t, e = Error) {
  if (!n)
    throw new e(t);
}
function T(n) {
  return n + 7 & -8;
}
const y = {};
let f, D, a, nt = 0;
const C = 8, I = 4, b = 4, R = 8, rt = 16;
function j() {
  for (; Atomics.compareExchange(a, C >> 2, 0, 1) === 1; )
    ;
}
function L() {
  Atomics.store(a, C >> 2, 0);
}
function mt(n, t = !1) {
  if (f)
    return f;
  if (typeof n == "number") {
    const e = t ? SharedArrayBuffer : ArrayBuffer;
    f = new e(T(n));
  } else
    f = n;
  return D = new Uint8Array(f), a = new Uint32Array(f), y.buffer = f, y.u8 = D, y.u16 = new Uint16Array(f), y.u32 = a, y.u64 = new BigUint64Array(f), y.i8 = new Int8Array(f), y.i16 = new Int16Array(f), y.i32 = new Int32Array(f), y.i64 = new BigInt64Array(f), y.f32 = new Float32Array(f), y.f64 = new Float64Array(f), y.dataview = new DataView(f), nt = f.byteLength - 4, typeof n == "number" && (a[1] = f.byteLength - 8, a[a.length - 2] = f.byteLength - 8, q(8)), f;
}
function q(n) {
  const t = T(n), e = R + t;
  let s = C - I;
  for (j(); s < nt; ) {
    const i = a[s >> 2], r = i & -2;
    if (i !== r || r < e) {
      s += r;
      continue;
    }
    const c = r - e >= rt, u = c ? e : r;
    if (a[s >> 2] = u | 1, a[s + u - b >> 2] = u | 1, c) {
      const l = s + e, d = r - e;
      a[l >> 2] = d, a[l + d - b >> 2] = d;
    }
    return L(), s + I;
  }
  throw L(), new Error(`Out of memory (requesting ${n} bytes).`);
}
function ot(n) {
  if (_ && w(
    n % 8 === 0,
    "Invalid pointer in realloc - pointer was not correctly aligned."
  ), n === C || n === 0)
    return;
  let t = n - I;
  j();
  let e = a[t >> 2] & -2, s = t + e - b;
  if (a[t >> 2] &= -2, a[s >> 2] &= -2, s !== f.byteLength - b) {
    const i = a[t + e >> 2];
    i & 1 || (s += i, e += i);
  }
  if (t !== 0) {
    const i = a[t - b >> 2];
    i & 1 || (t -= i, e += i);
  }
  a[t >> 2] = e, a[s >> 2] = e, D.fill(0, t + I, s - I), L();
}
function gt(n, t) {
  if (_ && w(
    n % 8 === 0,
    "Invalid pointer in realloc - pointer was not correctly aligned."
  ), n === C || n === 0)
    return q(t);
  const e = T(t);
  j();
  const s = n - I, i = a[s >> 2] & -2, r = i - R;
  if (r >= e)
    return L(), n;
  const o = s + i, c = a[o >> 2];
  if (!(c & 1) && c - R >= e - i) {
    const l = e - r, d = c - l >= rt, m = d ? e + R : i + c;
    if (a[o >> 2] = 0, a[o - b >> 2] = 0, a[s >> 2] = m | 1, a[s + m - b >> 2] = m | 1, d) {
      const B = i + c - m;
      a[s + m >> 2] = B, a[s + m + B - b >> 2] = B;
    }
    return L(), n;
  }
  L();
  const u = q(e);
  return H(n, r, u), ot(n), u;
}
function H(n, t, e) {
  D.copyWithin(e, n, n + t);
}
function ct(n, t, e) {
  D.fill(e, n, n + t);
}
function wt(n) {
  if (n === C || n === 0)
    return C;
  const t = (a[n - I >> 2] & -2) - R, e = q(t);
  return H(n, t, e), e;
}
function pt() {
  f && (ct(0, f.byteLength, 0), a[1] = f.byteLength - 8, a[a.length - 2] = f.byteLength - 8, q(8));
}
const h = {
  init: mt,
  alloc: q,
  free: ot,
  realloc: gt,
  copy: H,
  copyPointer: wt,
  set: ct,
  views: y,
  UNSAFE_CLEAR_ALL: pt
};
function ht(n) {
  const t = new ArrayBuffer(
    T(n.constructor.size)
  );
  n.__$$s ??= {
    buffer: t,
    u8: new Uint8Array(t),
    u16: new Uint16Array(t),
    u32: new Uint32Array(t),
    u64: new BigUint64Array(t),
    i8: new Int8Array(t),
    i16: new Int16Array(t),
    i32: new Int32Array(t),
    i64: new BigInt64Array(t),
    f32: new Float32Array(t),
    f64: new Float64Array(t),
    dataview: new DataView(t)
  }, n.__$$b ??= 0;
}
function ue(n) {
  const t = n.constructor;
  for (const e of t.pointers ?? [])
    h.free(
      n.__$$s.u32[n.__$$b + e >> 2]
    );
}
class g {
  static size = 8;
  static alignment = 8;
  #t;
  constructor(t, e) {
    ht(this), this.#t = t, e !== void 0 && (this.__$$s.u64[0] = e);
  }
  /**
   * The entity's world-unique integer id (uint64).
   * Composed of an entity's generation & index.
   */
  get id() {
    return this.__$$s.u64[this.__$$b >> 3];
  }
  /**
   * The index of this entity (uint32).
   */
  get index() {
    return this.__$$s.u32[this.__$$b >> 2];
  }
  /**
   * The generation of this entity (uint32).
   */
  get generation() {
    return this.__$$s.u32[(this.__$$b >> 2) + 1];
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
class k {
  static createEmptyTable(t) {
    const e = t.threads.queue(() => {
      const i = h.alloc(8);
      return h.views.u32[i >> 2] = 4294967295, h.views.u32[(i >> 2) + 1] = 4294967295, i;
    });
    return new this(t, [], e, 0n, 0);
  }
  static createRecycledTable(t) {
    const e = t.threads.queue(() => {
      const s = t.config.getNewTableSize(0), i = h.alloc(8);
      return h.views.u32[i >> 2] = 0, h.views.u32[(i >> 2) + 1] = s, h.views.u32[(i >> 2) + 2] = h.alloc(
        s * g.size
      ), i;
    });
    return new this(t, [g], e, 0n, 1);
  }
  static create(t, e, s, i) {
    const r = t.config.getNewTableSize(0), o = e.filter(
      (l) => l.size > 0
    ), c = h.alloc(4 * (2 + o.length));
    h.views.u32[(c >> 2) + 1] = r;
    let u = 2;
    for (const l of o)
      h.views.u32[(c >> 2) + u] = h.alloc(
        l.size * r
      ), u++;
    return new this(t, o, c, s, i);
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
    return h.views.u32[(this.#s >> 2) + 1];
  }
  get size() {
    return h.views.u32[this.#s >> 2];
  }
  set size(t) {
    h.views.u32[this.#s >> 2] = t;
  }
  getColumn(t) {
    return h.views.u32[(this.#s >> 2) + 2 + this.#e.indexOf(t)];
  }
  hasColumn(t) {
    return this.#e.includes(t);
  }
  delete(t) {
    this.size--;
    let e = 2;
    for (const s of this.#e) {
      const i = h.views.u32[(this.#s >> 2) + e];
      h.copy(
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
    const { u32: s, u64: i } = h.views;
    if (this.#e[0] !== g)
      return e.size++, BigInt(t);
    const r = this.getColumn(g), o = i[(r >> 3) + this.size];
    for (const c of this.#e) {
      const u = this.getColumn(c) + t * c.size;
      if (e.hasColumn(c))
        h.copy(
          u,
          c.size,
          e.getColumn(c) + e.size * c.size
        );
      else
        for (const l of c.pointers ?? [])
          h.free(s[u + l >> 2]);
    }
    return e.size++, this.delete(t), o;
  }
  grow() {
    h.views.u32[(this.#s >> 2) + 1] = this.#t.config.getNewTableSize(this.capacity);
    let t = 2;
    for (const e of this.#e)
      h.views.u32[(this.#s >> 2) + t] = h.realloc(
        h.views.u32[(this.#s >> 2) + t],
        e.size * this.capacity
      ), t++;
  }
  copyComponentIntoRow(t, e, s) {
    this.hasColumn(e) && h.copy(
      s,
      e.size,
      this.getColumn(e) + t * e.size
    );
  }
}
const yt = 0x00000000ffffffffn, st = (n) => Number(n & yt), U = 256, _t = 1n << 32n;
class vt {
  static fromWorld(t) {
    return new this(
      t,
      t.threads.queue(() => {
        const { u32: e } = h.views, s = h.alloc(4 * 4) >> 2;
        return e[s + 2] = h.alloc(8 * U), e[s + 3] = U, s;
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
    const { u32: t, u64: e } = h.views, s = this.#s.size, i = this.#s.getColumn(g);
    for (let r = this.#c(); r < s; r = this.#c())
      if (this.#o(r))
        return e[(i >> 3) + r] + _t;
    return BigInt(Atomics.add(t, this.#e, 1));
  }
  /**
   * Checks if an entity is currently alive or not.
   * @param entityId The entity id to check
   * @returns `true` if alive, `false` if not.
   */
  isAlive(t) {
    const { u32: e, u64: s } = h.views, i = this.getTableIndex(t), r = this.getRow(t), o = this.#t.archetypes[i].getColumn(g);
    return st(t) < Atomics.load(e, this.#e) && (i === 0 || i !== 1 || s[(o >> 3) + r] === t);
  }
  resetCursor() {
    const { u32: t } = h.views;
    if (t[this.#e + 1] = 0, t[this.#e] >= this.#r) {
      const e = Math.ceil((t[this.#e] + 1) / U) * U;
      this.#i = h.realloc(
        this.#i,
        e * 8
      ), t[this.#e + 3] = e;
    }
  }
  getTableIndex(t) {
    return h.views.u32[this.#n(t)] ?? 0;
  }
  setTableIndex(t, e) {
    h.views.u32[this.#n(t)] = e;
  }
  getRow(t) {
    return h.views.u32[this.#n(t) + 1] ?? 0;
  }
  setRow(t, e) {
    h.views.u32[this.#n(t) + 1] = e;
  }
  getBitset(t) {
    return this.#t.archetypes[this.getTableIndex(t)].bitfield;
  }
  get #i() {
    return h.views.u32[this.#e + 2];
  }
  set #i(t) {
    h.views.u32[this.#e + 2] = t;
  }
  get #r() {
    return h.views.u32[this.#e + 3];
  }
  set #r(t) {
    h.views.u32[this.#e + 3] = t;
  }
  #n(t) {
    return (this.#i >> 2) + (st(t) << 1);
  }
  /**
   * Atomically grabs the current cursor.
   * @returns The current cursor value.
   */
  #c() {
    return Atomics.load(h.views.u32, this.#e + 1);
  }
  /**
   * Tries to atomically move the cursor by one.
   * @param expected The value the cursor is currently expected to be.
   * @returns A boolean, indicating if the move was successful or not.
   */
  #o(t) {
    return t === Atomics.compareExchange(
      h.views.u32,
      this.#e + 1,
      t,
      t + 1
    );
  }
}
class Et {
  static fromWorld(t) {
    const e = t.threads.queue(() => {
      const i = t.components.reduce(
        (c, u) => c + u.size,
        0
      ), r = [];
      let o = h.alloc(i);
      for (const c of t.components)
        r.push(o), c.size !== 0 && (h.views.u8.set(new c().__$$s.u8, o), o += c.size);
      return r;
    }), s = t.threads.queue(
      () => h.alloc((1 + 3 * t.config.threads) * 4)
    );
    return new this(t, e, s);
  }
  #t = { entityId: 0n, componentId: 0, dataStart: 0 };
  #e = /* @__PURE__ */ new Map();
  #s;
  #i;
  #r;
  #n;
  // [nextId, ...[length, capacity, pointer]]
  #c;
  constructor(t, e, s) {
    this.#s = t.entities, this.#i = t.components, this.#r = e, this.#n = s >> 2, this.#c = 3 * Atomics.add(h.views.u32, this.#n, 1) + this.#n + 1;
  }
  get #o() {
    return h.views.u32[this.#c];
  }
  set #o(t) {
    h.views.u32[this.#c] = t;
  }
  get #a() {
    return h.views.u32[this.#c + 1];
  }
  set #a(t) {
    h.views.u32[this.#c + 1] = t;
  }
  get #l() {
    return h.views.u32[this.#c + 2];
  }
  set #l(t) {
    h.views.u32[this.#c + 2] = t;
  }
  get #h() {
    return this.#l + this.#o;
  }
  /**
   * Queues an entity to be spawned.
   * @returns An `Entity` instance, to add/remove components from an entity.
   */
  spawn() {
    const t = this.#s.spawn();
    return this.#u("add", t, g), h.views.u64[this.#h >> 3] = t, this.#o += 8, new g(this, t);
  }
  /**
   * Queues an entity to be despawned.
   * @param id The id of the entity to despawn.
   * @returns `this`, for chaining.
   */
  despawn(t) {
    this.#u("remove", t, g);
  }
  /**
   * Gets an entity to modify.
   * @param id The id of the entity to get.
   * @returns An `Entity` instance, to add/remove components from an entity.
   */
  getEntityById(t) {
    return new g(this, t);
  }
  insertInto(t, e) {
    const s = e.constructor;
    _ && w(
      s !== g,
      "Tried to add Entity component, which is forbidden."
    ), this.#u("add", t, s), s.size !== 0 && (h.views.u8.set(
      e.__$$s.u8.subarray(
        e.__$$b,
        s.size
      ),
      this.#h
    ), this.#d(s), this.#o += T(s.size));
  }
  insertTypeInto(t, e) {
    _ && w(
      e !== g,
      "Tried to add Entity component, which is forbidden."
    ), this.#u("add", t, e), e.size !== 0 && (h.copy(
      this.#r[this.#i.indexOf(e)],
      e.size,
      this.#h
    ), this.#d(e), this.#o += T(e.size));
  }
  removeFrom(t, e) {
    _ && w(
      e !== g,
      "Tried to remove Entity component, which is forbidden."
    ), this.#u("remove", t, e);
  }
  getDestinations() {
    this.#e.clear();
    const { u8: t, u16: e, u64: s } = h.views;
    for (const i of this.#f()) {
      const r = s[i + 8 >> 3];
      let o = this.#e.get(r);
      if (o === 0n)
        continue;
      const c = e[i + 4 >> 1], u = t[i + 6] === 0;
      o ??= this.#s.getBitset(r), this.#e.set(
        r,
        u ? o | 1n << BigInt(c) : c === 0 ? 0n : o ^ 1n << BigInt(c)
      );
    }
    return this.#e;
  }
  *[Symbol.iterator]() {
    const { u16: t, u32: e, u64: s } = h.views;
    for (const i of this.#f())
      e[i >> 2] !== 16 && (this.#t.componentId = t[i + 4 >> 1], this.#t.entityId = s[i + 8 >> 3], this.#t.dataStart = i + 16, yield this.#t);
  }
  reset() {
    const { u32: t } = h.views, e = 1 + t[this.#n] * 3;
    for (let s = 1; s < e; s += 3)
      t[this.#n + s] = 0;
  }
  *#f() {
    const { u32: t } = h.views, e = 1 + t[this.#n] * 3;
    for (let s = 1; s < e; s += 3) {
      const i = t[this.#n + s + 2], r = i + t[this.#n + s];
      for (let o = i; o < r; o += t[o >> 2])
        yield o;
    }
  }
  #u(t, e, s) {
    _ && w(
      this.#i.includes(s),
      `Tried to ${t} unregistered component (${s.name}) on an Entity.`
    );
    const i = T(
      16 + (t === "add" ? s.size : 0)
    );
    if (this.#a < this.#o + i) {
      const o = (this.#o + i) * 2;
      this.#a = o, this.#l = h.realloc(this.#l, o);
    }
    const r = this.#h;
    h.views.u32[r >> 2] = i, h.views.u16[r + 4 >> 1] = this.#i.indexOf(s), h.views.u8[r + 6] = t === "add" ? 0 : 1, h.views.u64[r + 8 >> 3] = e, this.#o += 16;
  }
  #d(t) {
    const e = this.#h;
    for (const s of t.pointers ?? [])
      h.views.u32[e + s >> 2] = h.copyPointer(
        h.views.u32[e + s >> 2]
      );
  }
}
class $t {
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
class At {
  #t = [];
  #e = 0;
  #s;
  #i;
  #r;
  #n;
  #c;
  #o;
  #a;
  constructor(t, e, s, i, r) {
    this.#i = t, this.#r = e, this.#c = s, this.#n = i, this.#o = r.commands, this.#a = h.views, this.#s = this.#n.map((o) => {
      const c = o === g ? (
        //@ts-ignore
        new o(this.#o)
      ) : new o();
      return c.__$$s = this.#a, c;
    });
  }
  get size() {
    return this.#t.reduce((t, e) => t + e.size, 0);
  }
  *[Symbol.iterator]() {
    this.#e >= this.#s.length && this.#s.push(
      ...this.#n.map((s) => {
        const i = s === g ? (
          //@ts-ignore
          new s(this.#o)
        ) : new s();
        return i.__$$s = this.#a, i;
      })
    );
    const t = this.#s.slice(
      this.#e,
      this.#e + this.#n.length
    ), e = this.#e;
    this.#e += this.#n.length;
    for (const s of this.#t) {
      t.forEach((i, r) => {
        const o = this.#s[r + e];
        s.hasColumn(o.constructor) ? (t[r] = o, t[r].__$$b = s.getColumn(
          o.constructor
        )) : t[r] = null;
      });
      for (let i = 0; i < s.size; i++) {
        this.#c ? yield t[0] : yield t;
        for (const r of t)
          r && (r.__$$b += r.constructor.size);
      }
    }
  }
  testAdd(t, e) {
    this.#l(t) && this.#t.push(e);
  }
  #l(t) {
    for (let e = 0; e < this.#i.length; e++)
      if ((this.#i[e] & t) === this.#i[e] && (this.#r[e] & t) === 0n)
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
class P {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class G {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class J {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class X {
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
const V = (n, t, e = []) => (Array.isArray(t) ? t : [t]).reduce(
  (s, i, r) => e[r] ? s : s | 1n << BigInt(n.indexOf(i)),
  0n
);
function x(n, t, e) {
  let s = e;
  for (const i of Array.isArray(n) ? n : [n])
    s = t(s, i);
  return s;
}
function bt(n, t) {
  x(t, function e(s, i) {
    i instanceof G || i instanceof J ? (i.value instanceof Array ? i.value : [i.value]).forEach((o) => n.registerComponent(o)) : i instanceof X && (x(i.l, e), x(i.r, e));
  });
}
function St(n, t, e, s) {
  const i = x(
    s,
    function o(c, u) {
      if (u instanceof G) {
        const l = V(
          n,
          u.value
        );
        return {
          withs: c.withs.map((d) => d | l),
          withouts: c.withouts
        };
      } else if (u instanceof J) {
        const l = V(
          n,
          u.value
        );
        return {
          withs: c.withs,
          withouts: c.withouts.map((d) => d | l)
        };
      } else if (u instanceof X) {
        const l = x(u.l, o, c), d = x(u.r, o, c);
        return {
          withs: [...l.withs, ...d.withs],
          withouts: [...l.withouts, ...d.withouts]
        };
      }
      throw new Error(
        `Unrecognized filter (${u.constructor.name}) in Query.`
      );
    },
    {
      withs: [
        V(n, t, e)
      ],
      withouts: [0n]
    }
  ), r = i.withs.reduce(
    (o, c, u) => (i.withs[u] & i.withouts[u]) === 0n ? o.add(u) : o,
    /* @__PURE__ */ new Set()
  );
  return i.withs = i.withs.filter((o, c) => r.has(c)), i.withouts = i.withouts.filter((o, c) => r.has(c)), _ && w(
    i.withs.length > 0,
    "Tried to construct a query that cannot match any entities."
  ), i;
}
class K {
  components = [];
  writes = [];
  optionals = [];
  filters;
  isIndividual;
  constructor(t, e = []) {
    this.isIndividual = !Array.isArray(t);
    const s = Array.isArray(t) ? t : [t];
    for (const i of s) {
      const r = i instanceof P || i instanceof Y && i.value instanceof P;
      this.writes.push(r), this.optionals.push(i instanceof Y);
      const o = i instanceof P ? i.value : i instanceof Y ? i.value instanceof P ? i.value.value : i.value : i;
      _ && w(
        o.size > 0,
        "You may not request direct access to ZSTs - use a With filter instead."
      ), this.components.push(o);
    }
    this.filters = e;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof K ? this.components.some(
      (e, s) => t.components.some(
        (i, r) => e === i && (this.writes[s] || t.writes[r])
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e)), bt(t, this.filters);
  }
  intoArgument(t) {
    const { withs: e, withouts: s } = St(
      t.components,
      this.components,
      this.optionals,
      this.filters
    ), i = new At(
      e,
      s,
      this.isIndividual,
      this.components,
      t
    );
    return t.queries.push(i), i;
  }
}
const ut = {
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
let M = 1, Q = 0, $ = [], S = [], A = {}, Z = {};
const Tt = (n, t, e) => {
  const s = S.reduce(
    (r, o, c) => o < t && c < r ? c : r,
    S.length
  );
  if (s === S.length) {
    $.push(n), S.push(t), A[n] = $.length === 0 ? 0 : Q;
    return;
  }
  const i = $[s];
  $.splice(s, 0, n), S.splice(s, 0, t), A[n] = A[i];
  for (let r = s + 1; r < $.length; r++)
    A[$[r]] += e;
};
function N(n, t, e, s) {
  return M = Math.max(M, t), s && (Z[n] = s), Tt(n, t, e), Q += e, A;
}
function It() {
  const n = [];
  for (const e in Z)
    for (const s of Z[e])
      n.push(s + A[e]);
  const t = {
    size: Math.ceil(Q / M) * M,
    alignment: M,
    pointers: n
  };
  Q = 0, M = 1;
  for (let e = 0; e < $.length; e++)
    A[$[e]] /= S[e];
  return A = {}, $.length = 0, S.length = 0, t;
}
function v(n) {
  return function(e, s) {
    const i = ut[n], r = N(
      s,
      i.BYTES_PER_ELEMENT,
      i.BYTES_PER_ELEMENT
    ), o = 31 - Math.clz32(i.BYTES_PER_ELEMENT);
    Object.defineProperty(e, s, {
      enumerable: !0,
      get() {
        return this.__$$s[n][(this.__$$b >> o) + r[s]];
      },
      set(c) {
        this.__$$s[n][(this.__$$b >> o) + r[s]] = c;
      }
    });
  };
}
const zt = v("u8"), Ct = v("u16"), Bt = v("u32"), Pt = v("u64"), Mt = v("i8"), Lt = v("i16"), xt = v("i32"), qt = v("i64"), Rt = v("f32"), Ot = v("f64"), Dt = function(t, e) {
  const s = N(
    e,
    Uint8Array.BYTES_PER_ELEMENT,
    Uint8Array.BYTES_PER_ELEMENT
  );
  Object.defineProperty(t, e, {
    enumerable: !0,
    get() {
      return !!this.__$$s.u8[this.__$$b + s[e]];
    },
    set(i) {
      this.__$$s.u8[this.__$$b + s[e]] = Number(i);
    }
  });
};
function Wt(n) {
  let t = n.length;
  for (let e = n.length - 1; e >= 0; e--) {
    const s = n.charCodeAt(e);
    s > 127 && s <= 2047 ? t++ : s > 2047 && s <= 65535 && (t += 2), s >= 56320 && s <= 57343 && e--;
  }
  return t;
}
const Nt = new TextEncoder(), Ut = new TextDecoder();
function Ft(n, t) {
  const e = N(
    t,
    Uint32Array.BYTES_PER_ELEMENT,
    Uint32Array.BYTES_PER_ELEMENT * 3,
    [8]
  );
  Object.defineProperty(n, t, {
    enumerable: !0,
    get() {
      const s = this.__$$b + e[t], i = this.__$$s.u32[s >> 2], r = this.__$$s.u32[s + 8 >> 2];
      return Ut.decode(h.views.u8.subarray(r, r + i));
    },
    set(s) {
      const i = Wt(s), r = this.__$$b + e[t], o = this.__$$s.u32[r + 4 >> 2];
      let c = this.__$$s.u32[r + 8 >> 2];
      if (o < i) {
        const u = h.realloc(c, i);
        c = u, this.__$$s.u32[r + 4 >> 2] = i, this.__$$s.u32[r + 8 >> 2] = u;
      }
      this.__$$s.u32[r >> 2] = i, Nt.encodeInto(
        s,
        h.views.u8.subarray(c, c + i)
      );
    }
  });
}
function kt({ type: n, length: t }) {
  return function(s, i) {
    const r = ut[n], o = N(
      i,
      r.BYTES_PER_ELEMENT,
      r.BYTES_PER_ELEMENT * t
    ), c = 31 - Math.clz32(r.BYTES_PER_ELEMENT);
    Object.defineProperty(s, i, {
      enumerable: !0,
      get() {
        return this.__$$s[n].subarray(
          (this.__$$b >> c) + o[i],
          (this.__$$b >> c) + o[i] + t
        );
      },
      set(u) {
        this.__$$s[n].set(
          u.subarray(0, t),
          (this.__$$b >> c) + o[i]
        );
      }
    });
  };
}
function Yt(n) {
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
        const r = new n();
        return r.__$$s = this.__$$s, r.__$$b = this.__$$b + i[s] * n.alignment, r;
      },
      set(r) {
        this.__$$s.u8.set(
          r.__$$s,
          this.__$$b + i[s] * n.alignment
        );
      }
    });
  };
}
function p(n) {
  const { size: t, alignment: e, pointers: s } = It();
  return class extends n {
    static size = t;
    static alignment = e;
    static pointers = s;
    constructor(...i) {
      super(...i), ht(this);
    }
  };
}
p.bool = Dt;
p.u8 = zt;
p.u16 = Ct;
p.u32 = Bt;
p.u64 = Pt;
p.i8 = Mt;
p.i16 = Lt;
p.i32 = xt;
p.i64 = qt;
p.f32 = Rt;
p.f64 = Ot;
p.string = Ft;
p.array = kt;
p.substruct = Yt;
function W(n) {
  return typeof n == "function" && //@ts-ignore
  typeof n.size == "number" && //@ts-ignore
  typeof n.alignment == "number";
}
class tt {
  resource;
  canWrite;
  constructor(t) {
    const e = t instanceof P;
    this.resource = e ? t.value : t, this.canWrite = e;
  }
  isLocalToThread() {
    return !W(this.resource);
  }
  intersectsWith(t) {
    return t instanceof tt ? this.resource === t.resource && (this.canWrite || t.canWrite) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class Qt {
  resource;
  constructor(t) {
    this.resource = t;
  }
  isLocalToThread() {
    return !W(this.resource);
  }
  intersectsWith(t) {
    return !1;
  }
  onAddSystem(t) {
  }
  async intoArgument(t) {
    const { resource: e } = this, s = new e();
    return W(e) && (s.__$$s = h.views, s.__$$b = t.threads.queue(
      () => h.alloc(e.size)
    )), t.threads.isMainThread && await s.initialize?.(), s;
  }
}
class Vt {
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
const Zt = {
  Commands: E($t),
  Query: E(K),
  Res: E(tt),
  World: E(Vt),
  SystemRes: E(Qt),
  Mut: E(P),
  Optional: E(Y),
  With: E(G),
  Without: E(J),
  Or(n, t) {
    return new X(n, t);
  }
};
class et {
  #t = 0;
  #e = [];
  #s;
  fn;
  constructor(t, e) {
    this.#s = t, this.fn = e;
  }
  get parameters() {
    return this.#s(Zt);
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
    return new et(this.#s, this.fn);
  }
  getAndClearDependencies() {
    const t = {
      dependencies: this.#e,
      implicitPosition: this.#t
    };
    return this.#e = [], this.#t = 0, t;
  }
}
function jt(n, t) {
  return new et(n, t);
}
const at = jt(
  ({ World: n }) => [n()],
  function(t) {
    t.entities.resetCursor();
    for (const [e, s] of t.commands.getDestinations())
      t.moveEntity(e, s);
    for (const { entityId: e, componentId: s, dataStart: i } of t.commands) {
      const r = t.entities.getTableIndex(e);
      r === 0 || r === 1 || t.archetypes[r].copyComponentIntoRow(
        t.entities.getRow(e),
        t.components[s],
        i
      );
    }
    t.commands.reset();
  }
);
function* z(n) {
  let t = 0;
  for (; n !== 0n; )
    (n & 1n) === 1n && (yield t), n >>= 1n, t++;
}
let Ht = 1;
function Gt(n, t) {
  function e(...s) {
    return [n, Ht++, s];
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
  #r;
  constructor(t) {
    this.#r = t;
    const e = ({
      currentTarget: s,
      data: [i, r, o]
    }) => {
      if (this.#t.has(r)) {
        const c = this.#e.get(r);
        c.push(o), c.length === this.#r.length && (this.#t.get(r)(c), this.#t.delete(r), this.#e.delete(r));
      } else
        i in this.#s ? s.postMessage([
          i,
          r,
          this.#s[i](...o)
        ]) : s.postMessage([i, r, null]);
    };
    for (const s of this.#r)
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
    return this.#r.length === 0 ? Promise.resolve([]) : new Promise((e) => {
      for (const s of this.#r)
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
const lt = Gt(
  "thyseus::sendTable",
  (n) => (t, e, s) => {
    const i = [...z(s)].reduce((o, c) => {
      const u = n.components[c];
      return u.size > 0 && o.push(u), o;
    }, []), r = new k(n, i, t, s, e);
    n.archetypes[e] = r;
    for (const o of n.queries)
      o.testAdd(s, r);
  }
);
function Jt(n) {
  n.registerComponent(g).addSystem(at.afterAll()).registerThreadChannel(lt);
}
function Xt(n, t) {
  return n.parameters.some(
    (e) => t.parameters.some(
      (s) => e.intersectsWith(s) || s.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function ft(n) {
  return n.map(
    (t) => n.reduce(
      (e, s, i) => e | BigInt(Xt(t, s)) << BigInt(i),
      0n
    )
  );
}
function dt(n, t, e) {
  const s = t.map(
    (r) => r.dependencies.reduce((o, c) => {
      const u = n.indexOf(c);
      return u === -1 ? o : o | 1n << BigInt(u);
    }, 0n)
  ), i = [...s];
  i.forEach(function r(o, c) {
    for (const u of z(o))
      r(i[u], u), i[c] |= i[u];
  }), _ && i.forEach((r, o) => {
    w(
      (r & 1n << BigInt(o)) === 0n,
      `Circular Dependency Detected - Sytem #${o} (${n[o].fn.name}) depends on itself!`
    );
  });
  for (let r = 0; r < n.length; r++) {
    const o = t[r];
    if (o.implicitPosition === -1)
      for (const c of z(e[r]))
        c !== r && (i[r] & 1n << BigInt(c)) === 0n && (s[c] |= 1n << BigInt(r), i[c] |= 1n << BigInt(r));
    else if (o.implicitPosition === 1)
      for (const c of z(e[r]))
        c !== r && (i[c] & 1n << BigInt(r)) === 0n && (s[r] |= 1n << BigInt(c), i[r] |= 1n << BigInt(c));
  }
  return s.forEach((r, o) => s[o] &= e[o]), s;
}
function it(n, t, e) {
  for (const s of z(t))
    if (n[s] === e)
      return !1;
  return !0;
}
let Kt = 0;
const F = (...n) => {
};
class te {
  static fromWorld(t, e, s) {
    const i = t.threads.queue(
      () => ft(e)
    ), r = t.threads.queue(
      () => dt(e, s, i)
    ), o = t.threads.isMainThread ? e.map(() => !0) : e.map((d) => !d.parameters.some((m) => m.isLocalToThread())), { buffer: c } = h.views, u = t.threads.queue(
      () => h.alloc(8 + e.length * 3)
    ), l = t.threads.queue(
      () => `thyseus::ParallelExecutor${Kt++}`
    );
    return new this(
      t,
      new Uint32Array(c, u, 2),
      new Uint8Array(c, u + 8, e.length),
      new Uint8Array(
        c,
        u + 8 + e.length,
        e.length
      ),
      new Uint8Array(
        c,
        u + 8 + e.length * 2,
        e.length
      ),
      i,
      r,
      o,
      l
    );
  }
  #t = F;
  #e = F;
  #s;
  #i;
  #r;
  #n;
  #c;
  #o;
  #a;
  #l;
  #h;
  #f;
  #u;
  #d;
  constructor(t, e, s, i, r, o, c, u, l) {
    this.#u = t.systems, this.#d = t.arguments, this.#f = t.threads.isMainThread, this.#o = o, this.#a = c, this.#c = u, this.#s = e, this.#i = s, this.#r = i, this.#n = r, this.#h = new BroadcastChannel(l), this.#l = l, this.#h.addEventListener(
      "message",
      ({ data: d }) => {
        d === 0 ? this.#g() : d === 1 ? (this.#t(), this.#t = F) : (this.#e(), this.#e = F);
      }
    );
  }
  async start() {
    return this.#m = this.#u.length, this.#s[1] = 0, this.#i.fill(1), this.#n.fill(0), this.#r.fill(0), this.#w(), this.#g();
  }
  get #m() {
    return this.#s[0];
  }
  set #m(t) {
    this.#s[0] = t;
  }
  async #g() {
    for (; this.#m > 0; ) {
      let t = -1;
      if (await navigator.locks.request(this.#l, () => {
        t = this.#i.findIndex(
          (e, s) => !!e && it(this.#n, this.#a[s], 0) && it(this.#r, this.#o[s], 1) && this.#c[s]
        ), t !== -1 && (this.#i[t] = 0, this.#r[t] = 1, this.#m--);
      }), t === -1) {
        await this.#y();
        continue;
      }
      await this.#u[t](...this.#d[t]), await navigator.locks.request(this.#l, () => {
        this.#r[t] = 0, this.#n[t] = 1, Atomics.add(this.#s, 1, 1);
      }), this.#p();
    }
    this.#f && Atomics.load(this.#s, 1) !== this.#u.length && await this.#_();
  }
  #w() {
    this.#h.postMessage(0);
  }
  #p() {
    Atomics.load(this.#s, 1) === this.#u.length ? this.#h.postMessage(2) : this.#h.postMessage(1);
  }
  async #y() {
    return new Promise((t) => this.#t = t);
  }
  async #_() {
    return new Promise((t) => this.#e = t);
  }
}
class ee {
  static fromWorld(t, e, s) {
    const i = dt(
      e,
      s,
      ft(e)
    ), r = i.reduce(function o(c, u, l) {
      for (const d of z(u))
        o(c, i[d], d);
      return c.includes(l) || c.push(l), c;
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
class se {
  systems = [];
  #t = [];
  #e = [];
  components = /* @__PURE__ */ new Set();
  resources = /* @__PURE__ */ new Set();
  threadChannels = [];
  executor;
  config;
  url;
  constructor(t, e) {
    this.config = t, this.url = e, this.executor = t.threads > 1 ? te : ee, Jt(this);
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
   * @param struct The struct to register.
   * @returns `this`, for chaining.
   */
  registerComponent(t) {
    return this.components.add(t), this;
  }
  /**
   * Registers a Resource in the world. Called automatically for all accessed resources when a system is added.
   * @param ResourceType The ResourceType to register.
   * @returns `this`, for chaining.
   */
  registerResource(t) {
    return this.resources.add(t), this;
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
      () => new ce(
        this.config,
        t,
        this.executor,
        [...this.components],
        [...this.resources],
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
        Array.from(
          e.resources.values(),
          (s) => (
            //@ts-ignore
            s.initialize?.(e)
          )
        )
      );
      for (const s of this.#e)
        await s.fn(
          ...s.parameters.map((i) => i.intoArgument(e))
        );
      await at.fn(e);
    }
    return e;
  }
}
const ie = 1048576, ne = (n = {}) => ({
  threads: 1,
  memory: 512 * ie,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...n
}), re = ({ threads: n, memory: t }, e) => {
  n > 1 && (w(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), w(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), w(
    e,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), w(
    Number.isInteger(n) && 0 < n && n < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  ), w(
    Number.isInteger(t) && t < 2 ** 32,
    "Invalid config - 'memory' must be at most 4 GB ((2**32) - 1 bytes)"
  );
};
function oe(n, t) {
  const e = ne(n);
  return _ && re(e, t), e;
}
class ce {
  static new(t, e) {
    return new se(oe(t, e), e);
  }
  #t = /* @__PURE__ */ new Map();
  archetypes = [];
  queries = [];
  resources = /* @__PURE__ */ new Map();
  systems = [];
  arguments = [];
  commands;
  entities;
  config;
  threads;
  executor;
  components;
  constructor(t, e, s, i, r, o, c, u) {
    this.config = t, this.threads = e, h.init(
      this.threads.queue(
        () => h.init(t.memory, t.threads > 1)
      )
    );
    const l = k.createEmptyTable(this), d = k.createRecycledTable(this);
    this.archetypes.push(l, d), this.#t.set(0n, d);
    for (const m of u)
      this.threads.setListener(
        m.channelName,
        m.onReceive(this)
      );
    this.components = i, this.entities = vt.fromWorld(this), this.commands = Et.fromWorld(this), this.executor = s.fromWorld(this, o, c);
    for (const m of r) {
      if (!W(m) && !e.isMainThread)
        continue;
      const B = new m();
      this.resources.set(m, new m()), W(m) && m.size > 0 && (B.__$$s = h.views, B.__$$b = this.threads.queue(
        () => h.alloc(m.size)
      ));
    }
  }
  async update() {
    return this.executor.start();
  }
  moveEntity(t, e) {
    if (!this.entities.isAlive(t))
      return;
    const s = this.archetypes[this.entities.getTableIndex(t)], i = this.#e(e), r = this.entities.getRow(t), o = s.move(r, i);
    this.entities.setRow(o, r), this.entities.setTableIndex(t, i.id), this.entities.setRow(t, i.size - 1);
  }
  #e(t) {
    let e = this.#t.get(t);
    if (e)
      return e;
    const s = this.archetypes.length;
    e = k.create(
      this,
      Array.from(z(t), (i) => this.components[i]),
      t,
      s
    ), this.#t.set(t, e), this.archetypes.push(e), this.threads.send(lt(e.pointer, s, t));
    for (const i of this.queries)
      i.testAdd(t, e);
    return e;
  }
}
function ae(n) {
  return n;
}
export {
  g as Entity,
  ce as World,
  at as applyCommands,
  Gt as createThreadChannel,
  ae as definePlugin,
  jt as defineSystem,
  ue as dropStruct,
  ht as initStruct,
  p as struct
};
