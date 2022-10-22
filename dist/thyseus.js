const X = Symbol("Thread::Send"), G = Symbol("Thread::Receive"), c = {
  Send: X,
  Receive: G
}, F = "@SERIALIZED";
class p {
  static isMainThread = !!globalThis.document;
  static spawn(t, e, i) {
    return new this(
      p.isMainThread ? Array.from(
        { length: t },
        () => new Worker(e, { type: "module" })
      ) : [globalThis],
      i
    );
  }
  #t = 0;
  #e = /* @__PURE__ */ new Map();
  #s = {};
  #i;
  #n;
  constructor(t, e) {
    this.#i = t, this.#n = e;
    const i = ({
      currentTarget: n,
      data: [r, o, a]
    }) => {
      this.#e.has(r) ? (this.#e.get(r)(this.#o(a)), this.#e.delete(r)) : o in this.#s ? n.postMessage([
        r,
        o,
        this.#r(
          this.#s[o](this.#o(a))
        )
      ]) : n.postMessage([r, o, null]);
    };
    for (const n of this.#i)
      n.addEventListener("message", i);
  }
  setListener(t, e) {
    this.#s[t] = e;
  }
  deleteListener(t) {
    delete this.#s[t];
  }
  send(t, e) {
    const i = this.#r(e);
    return Promise.all(
      this.#i.map((n) => {
        const r = this.#t++;
        return n.postMessage([r, t, i]), new Promise((o) => this.#e.set(r, o));
      })
    );
  }
  async sendOrReceive(t) {
    const e = "@@";
    if (p.isMainThread) {
      const i = t();
      return await this.send(e, i), i;
    } else {
      const i = await new Promise(
        (n) => this.setListener(e, n)
      );
      return this.deleteListener(e), i;
    }
  }
  #r(t) {
    if (typeof t != "object" || t === null)
      return t;
    if (Z(t))
      return [
        F,
        this.#n.indexOf(t.constructor),
        this.#r(t[c.Send]())
      ];
    for (const e in t)
      t[e] = this.#r(t[e], this.#n);
    return t;
  }
  #o(t) {
    if (Y(t) || tt(t))
      return t;
    if (H(t)) {
      const [, e, i] = t, n = this.#o(i);
      return this.#n[e][c.Receive](n);
    }
    for (const e in t)
      t[e] = this.#o(t[e], this.#n);
    return t;
  }
}
const Z = (s) => c.Send in s, H = (s) => Array.isArray(s) && s.length === 3 && s[0] === F, J = Object.getPrototypeOf(Uint8Array), Y = (s) => typeof s != "object" && typeof s != "function" && s !== null, tt = (s) => s instanceof J || s instanceof DataView || s instanceof ArrayBuffer || typeof SharedArrayBuffer !== void 0 && s instanceof SharedArrayBuffer;
function z(s) {
  return typeof s == "function" && c.Receive in s && c.Send in s.prototype;
}
const I = 0b11111111n;
class M {
  static with(t, e, i = !1) {
    const n = i ? SharedArrayBuffer : ArrayBuffer;
    return new this(
      t,
      e,
      new Uint8Array(new n(Math.ceil(t / 8) * e))
    );
  }
  #t;
  width;
  length;
  #e;
  constructor(t, e, i) {
    this.width = t, this.length = e, this.#e = i, this.#t = Math.ceil(this.width / 8);
  }
  get bytesPerElement() {
    return this.#t;
  }
  get byteLength() {
    return this.#e.byteLength;
  }
  get(t) {
    let e = 0n;
    const i = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      e |= BigInt(this.#e[i + n]) << BigInt(n * 8);
    return e;
  }
  set(t, e) {
    const i = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[i + n] = Number(e >> BigInt(n * 8) & I);
  }
  OR(t, e) {
    const i = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[i + n] |= Number(e >> BigInt(n * 8) & I);
  }
  AND(t, e) {
    const i = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[i + n] &= Number(e >> BigInt(n * 8) & I);
  }
  XOR(t, e) {
    const i = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[i + n] ^= Number(e >> BigInt(n * 8) & I);
  }
  [c.Send]() {
    return [this.width, this.length, this.#e];
  }
  static [c.Receive]([
    t,
    e,
    i
  ]) {
    return new this(t, e, i);
  }
}
const et = (s) => (s >>>= 0, 31 - Math.clz32(s & -s));
class st {
  #t;
  #e;
  static with(t, e) {
    const i = e ? SharedArrayBuffer : ArrayBuffer;
    return new this(
      new Uint32Array(new i(16)),
      new Uint32Array(new i(t))
    );
  }
  constructor(t, e) {
    this.#t = t, this.#e = e;
  }
  get() {
    for (let e = 0; e < this.#e.length && Atomics.load(this.#t, 1) !== 0; e++)
      for (; ; ) {
        const i = Atomics.load(this.#e, e);
        if (i === 0)
          break;
        const n = et(i);
        if (Atomics.xor(this.#e, e, 1 << n) === i)
          return Atomics.sub(this.#t, 1, 1), 32 * e + n;
      }
    const t = Atomics.add(this.#t, 0, 1);
    if (t === 4294967295)
      throw new Error("Too many entities spawned!");
    return t;
  }
  free(t) {
    (Atomics.or(this.#e, t >> 5, 1 << (t & 31)) & 1 << (t & 31)) === 0 && Atomics.add(this.#t, 1, 1);
  }
  [c.Send]() {
    return [this.#t, this.#e];
  }
  static [c.Receive]([t, e]) {
    return new this(t, e);
  }
}
function m(s, t, e = Error) {
  if (!s)
    throw new e(t);
}
class v {
  #t;
  #e;
  constructor(t, e = new Int32Array(new SharedArrayBuffer(4))) {
    this.#t = t, this.#e = e;
  }
  get isLocked() {
    return this.#e[0] === 1;
  }
  UNSAFE_getData() {
    return this.#t;
  }
  async request(t) {
    await this.#s();
    const e = await t(this.#t);
    return this.#i(), e;
  }
  async #s() {
    for (; ; ) {
      if (Atomics.compareExchange(
        this.#e,
        0,
        0,
        1
      ) === 0)
        return;
      await Atomics.waitAsync(this.#e, 0, 1).value;
    }
  }
  #i() {
    const t = Atomics.compareExchange(
      this.#e,
      0,
      1,
      0
    );
    Atomics.notify(this.#e, 0), m(
      t === 1,
      "Tried to unlock a mutex that was not locked."
    );
  }
  [c.Send]() {
    return [this.#t, this.#e];
  }
  static [c.Receive]([t, e]) {
    return new this(t, e);
  }
}
class P {
  static with(t, e = !1) {
    const i = e ? SharedArrayBuffer : ArrayBuffer;
    return new this(
      new Uint32Array(new i(t * 4)),
      new Uint32Array(new i(t * 4)),
      new Uint32Array(new i(4))
    );
  }
  sparse;
  dense;
  #t;
  constructor(t, e, i) {
    this.sparse = t, this.dense = e, this.#t = i;
  }
  get size() {
    return this.#t[0];
  }
  set size(t) {
    this.#t[0] = t;
  }
  has(t) {
    return this.dense[this.sparse[t]] === t && this.sparse[t] < this.size;
  }
  add(t) {
    if (this.has(t))
      return this;
    if (this.sparse.length <= t)
      throw new RangeError("Invalid index");
    return this.sparse[t] = this.size, this.dense[this.size] = t, this.size++, this;
  }
  delete(t) {
    if (!this.has(t))
      return !1;
    this.size--;
    const e = this.sparse[t];
    return this.dense[e] = this.dense[this.size], this.sparse[this.dense[e]] = e, !0;
  }
  clear() {
    this.size = 0;
  }
  *[Symbol.iterator]() {
    const t = this.size;
    for (let e = 0; e < t; e++)
      yield this.dense[e];
  }
  [c.Send]() {
    return [this.sparse, this.dense, this.#t];
  }
  static [c.Receive]([
    t,
    e,
    i
  ]) {
    return new this(t, e, i);
  }
}
class _ {
  static from(t, e, i) {
    return new this(
      t,
      e,
      P.with(t.length, !0),
      new v(M.with(t.length, 2, !0)),
      i
    );
  }
  #t;
  #e;
  #s;
  #i;
  #n;
  #r;
  constructor(t, e, i, n, r) {
    this.#e = t, this.#s = e, this.#i = i, this.#n = n, this.#t = new Int32Array(
      i[c.Send]()[2].buffer
    ), this.#r = r;
  }
  add(t) {
    this.#i.add(t);
  }
  start() {
    Atomics.notify(this.#t, 0);
  }
  reset() {
    const t = this.#n.UNSAFE_getData();
    t.set(0, 0n), t.set(1, 0n);
    for (let e = 0; e < this.#s.length; e++)
      this.#r.has(e) || this.#i.add(e);
  }
  async onReady(t) {
    const { async: e, value: i } = Atomics.waitAsync(this.#t, 0, 0);
    if (!e)
      throw new Error(
        "Trying to wait while there are still systems to execute"
      );
    await i, t();
  }
  async *[Symbol.asyncIterator]() {
    const t = new Set(this.#r);
    for (; this.#i.size + t.size > 0; ) {
      const e = this.#i.size;
      let i = -1;
      await this.#n.request((n) => {
        const r = n.get(0), o = n.get(1);
        for (const a of [...t, ...this.#i])
          if ((r & this.#e[a]) === 0n && (o & this.#s[a]) === this.#s[a]) {
            i = a, this.#i.delete(a), t.delete(a), n.OR(0, 1n << BigInt(a));
            break;
          }
      }), i > -1 ? (yield i, await this.#n.request((n) => {
        n.XOR(0, 1n << BigInt(i)), n.OR(1, 1n << BigInt(i)), (this.#t[0] !== 0 || this.#t[0] === 0 && n.get(0) === 0n) && Atomics.notify(this.#t, 0);
      })) : e !== 0 && await Atomics.waitAsync(this.#t, 0, e).value;
    }
  }
  [c.Send]() {
    return [
      this.#e,
      this.#s,
      this.#i,
      this.#n
    ];
  }
  static [c.Receive](t) {
    return new this(...t, /* @__PURE__ */ new Set());
  }
}
function it() {
  return [P, v, M, _, st];
}
function j(s, t) {
  const e = [...t];
  return [...s].reduce(
    (i, n, r) => i.set(n, e[r]),
    /* @__PURE__ */ new Map()
  );
}
var f = /* @__PURE__ */ ((s) => (s[s.u8 = 0] = "u8", s[s.u16 = 1] = "u16", s[s.u32 = 2] = "u32", s[s.u64 = 3] = "u64", s[s.i8 = 4] = "i8", s[s.i16 = 5] = "i16", s[s.i32 = 6] = "i32", s[s.i64 = 7] = "i64", s[s.f32 = 8] = "f32", s[s.f64 = 9] = "f64", s))(f || {});
const E = {
  [0]: 1,
  [1]: 2,
  [2]: 4,
  [3]: 8,
  [4]: 1,
  [5]: 2,
  [6]: 4,
  [7]: 8,
  [8]: 4,
  [9]: 8
}, D = {
  [0]: Uint8Array,
  [1]: Uint16Array,
  [2]: Uint32Array,
  [3]: BigUint64Array,
  [4]: Int8Array,
  [5]: Int16Array,
  [6]: Int32Array,
  [7]: BigInt64Array,
  [8]: Float32Array,
  [9]: Float64Array
};
function V(s) {
  return Object.values(s).reduce(
    (t, e) => t + E[e],
    0
  );
}
function Ut(s) {
  if (!s)
    return class {
      static schema = {};
      static size = 0;
    };
  class t {
    static schema = s;
    static size = V(s);
    store;
    index;
    constructor(i, n) {
      this.store = i, this.index = n;
    }
  }
  for (const e in s) {
    const i = Array.isArray(s) ? Number(e) : e;
    Object.defineProperty(t.prototype, i, {
      enumerable: !0,
      get() {
        return this.store[i][this.index];
      },
      set(n) {
        this.store[i][this.index] = n;
      }
    });
  }
  return t;
}
function U(s, t) {
  return new (s.threads > 1 ? SharedArrayBuffer : ArrayBuffer)(t);
}
function nt(s, t, e) {
  const i = U(t, s.size * e), n = Array.isArray(s.schema);
  let r = 0;
  return Object.entries(s.schema).reduce(
    (o, [a, h], u) => {
      const d = n ? u : a;
      return o[d] = new D[h](i, r, e), r += e * E[h], o;
    },
    n ? [] : {}
  );
}
const Q = 32n, rt = 0x00000000ffffffffn, w = (s) => Number(s & rt), K = (s) => Number(s >> Q);
class A {
  static schema = { val: f.u64 };
  static size = 8;
  store;
  index;
  commands;
  constructor(t, e, i) {
    this.store = t, this.index = e, this.commands = i;
  }
  get id() {
    return this.store.val[this.index];
  }
  get entityIndex() {
    return w(this.id);
  }
  get generation() {
    return K(this.id);
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
function ot(s, t, e, i) {
  const n = U(t, s.size * e), r = Array.isArray(i);
  let o = 0;
  return Object.entries(s.schema).reduce(
    (a, [h, u], d) => {
      const l = r ? d : h;
      return a[l] = new D[u](n, o, e), a[l].set(i[l], 0), o += e * E[u], a;
    },
    r ? [] : {}
  );
}
class W {
  columns;
  meta;
  static create(t, e) {
    const i = new Uint32Array(2);
    return i[1] = e, new this(
      t.reduce(
        (n, r) => n.set(
          r,
          nt(r, { threads: 1 }, e)
        ),
        /* @__PURE__ */ new Map()
      ),
      i
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
  get isFull() {
    return this.capacity === this.size;
  }
  add(t) {
    this.columns.get(A).val[this.size++] = t;
  }
  delete(t) {
    for (const [, e] of this.columns)
      for (const i in e)
        e[i][t] = e[i][this.size - 1];
    this.size--;
  }
  move(t, e) {
    for (const [i, n] of this.columns)
      if (e.columns.has(i)) {
        const r = e.columns.get(i);
        for (const o in n)
          r[o][e.size] = n[o][t], n[o][t] = n[o][this.size - 1];
      }
    e.size++, this.size--;
  }
  grow(t) {
    for (const [e, i] of this.columns)
      ot(
        e,
        t,
        t.getNewTableSize(this.capacity),
        i
      );
  }
}
class at {
  queue = /* @__PURE__ */ new Map();
  #t;
  #e;
  #s;
  #i;
  constructor(t, e) {
    this.#t = t, this.#s = new BigUint64Array(1), this.#e = new A({ val: this.#s }, 0, this), this.#i = e;
  }
  spawn() {
    const t = this.#t.spawn();
    return this.#s[0] = t, this.insertInto(t, A), this.#e;
  }
  despawn(t) {
    return this.queue.set(t, 0n), this;
  }
  get(t) {
    return this.#s[0] = t, this.#e;
  }
  insertInto(t, e) {
    this.queue.set(
      t,
      (this.queue.get(t) ?? this.#t.getTableId(t)) | 1n << BigInt(q(this.#i, e))
    );
  }
  removeFrom(t, e) {
    this.queue.set(
      t,
      (this.queue.get(t) ?? this.#t.getTableId(t)) ^ 1n << BigInt(q(this.#i, e))
    );
  }
}
const q = (s, t) => [...s].indexOf(t);
class T {
  static async fromWorld(t) {
    const e = t.maxEntities;
    return new T(
      new Uint32Array(e),
      new M(8, e, new Uint8Array(e)),
      new Uint32Array(e),
      new Uint32Array(3),
      new Uint32Array(e)
    );
  }
  generations;
  tableIds;
  row;
  #t;
  #e;
  constructor(t, e, i, n, r) {
    this.generations = t, this.tableIds = e, this.row = i, this.#t = n, this.#e = r;
  }
  spawn() {
    for (let e = 0; e < this.#e.length && Atomics.load(this.#t, B.FreeCount) !== 0; e++)
      for (; ; ) {
        const i = Atomics.load(this.#e, e);
        if (i === 0)
          break;
        const n = ht(i);
        if (Atomics.xor(this.#e, e, 1 << n) === i)
          return Atomics.sub(this.#t, B.FreeCount, 1), BigInt(this.generations[n]) << Q | BigInt(32 * e + n);
      }
    const t = Atomics.add(this.#t, B.NextId, 1);
    return BigInt(t);
  }
  despawn(t) {
    const e = w(t), i = K(t);
    Atomics.compareExchange(
      this.generations,
      e,
      i,
      i + 1
    ) === i && (Atomics.or(this.#e, e >> 5, 1 << (e & 31)), Atomics.add(this.#t, B.FreeCount, 1));
  }
  getTableId(t) {
    return this.tableIds.get(w(t));
  }
  getRow(t) {
    return this.row[w(t)];
  }
  setLocation(t, e, i) {
    this.tableIds.set(w(t), e), this.row[w(t)] = i;
  }
}
const ht = (s) => (s >>>= 0, 31 - Math.clz32(s & -s));
var B = /* @__PURE__ */ ((s) => (s[s.NextId = 0] = "NextId", s[s.FreeCount = 1] = "FreeCount", s[s.MaxCount = 2] = "MaxCount", s))(B || {});
function Tt(s) {
  m(
    Object.keys(s).length !== 0,
    "Shareable Resources created with Resource() must pass a schema!"
  );
  class t {
    static create(n) {
      return new this(
        new DataView(U(n, V(s)))
      );
    }
    __$$;
    constructor(n) {
      this.__$$ = n;
    }
    [c.Send]() {
      return this.__$$;
    }
    static [c.Receive](n) {
      return new this(n);
    }
  }
  let e = 0;
  for (const i in s) {
    const n = Array.isArray(s) ? Number(i) : i, [r, o] = ct[s[n]];
    Object.defineProperty(t.prototype, n, {
      enumerable: !0,
      get() {
        return this.__$$[r](e);
      },
      set(a) {
        this.__$$[o](e, a);
      }
    }), e += E[s[n]];
  }
  return t;
}
const ct = {
  [f.u8]: ["getUint8", "setUint8"],
  [f.u16]: ["getUint16", "setUint16"],
  [f.u32]: ["getUint32", "setUint32"],
  [f.u64]: ["getBigUint64", "setBigUint64"],
  [f.i8]: ["getInt8", "setInt8"],
  [f.i16]: ["getInt16", "setInt16"],
  [f.i32]: ["getInt32", "setInt32"],
  [f.i64]: ["getBigInt64", "setBigInt64"],
  [f.f32]: ["getFloat32", "setFloat32"],
  [f.f64]: ["getFloat64", "setFloat64"]
};
function x(s, t) {
  return ut(s) ? s.create(t) : new s();
}
function ut(s) {
  return "create" in s && typeof s.create == "function";
}
class ft {
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
var g = /* @__PURE__ */ ((s) => (s[s.Read = 0] = "Read", s[s.Write = 1] = "Write", s))(g || {});
function dt(s, t) {
  return lt(s, t);
}
const lt = (s, t) => t.reduce(
  (e, i) => e | 1n << BigInt(s.indexOf(i)),
  0n
);
function L(s) {
  return [s, 1];
}
L.isMut = function(s) {
  return Array.isArray(s) && s.length === 2 && typeof s[0] == "function" && s[1] === 1;
};
class mt {
  #t;
  #e = [];
  #s;
  #i;
  constructor(t, e, i) {
    this.#i = e, this.#s = t, this.#t = this.#i.map(
      (n) => new n({}, 0, i)
    );
  }
  *[Symbol.iterator]() {
    for (const t of this.#e)
      for (let e = 0; e < t.size; e++) {
        for (const i of this.#t) {
          const n = t.columns.get(
            Object.getPrototypeOf(i).constructor
          );
          i.store = n, i.eid = e;
        }
        yield this.#t;
      }
  }
  testAdd(t, e) {
    this.#n(t) && this.#e.push(e);
  }
  #n(t) {
    return (t & this.#s) === this.#s;
  }
}
class O {
  components = [];
  accessType = [];
  constructor(t) {
    for (const e of t) {
      const i = L.isMut(e);
      this.components.push(i ? e[0] : e), this.accessType.push(i ? g.Write : g.Read);
    }
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof O ? this.components.some(
      (e, i) => t.components.some(
        (n, r) => e === n && (this.accessType[i] === g.Write || t.accessType[r] === g.Write)
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e));
  }
  intoArgument(t) {
    const e = new mt(
      dt(t.components, this.components),
      this.components,
      t.commands
    );
    return t.queries.push(e), e;
  }
}
class k {
  resource;
  accessType;
  constructor(t) {
    const e = L.isMut(t);
    this.resource = e ? t[0] : t, this.accessType = e ? g.Write : g.Read;
  }
  isLocalToThread() {
    return !z(this.resource);
  }
  intersectsWith(t) {
    return t instanceof k ? this.resource === t.resource && (this.accessType === g.Write || t.accessType === g.Write) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource), z(this.resource) && t.registerSendableClass(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class gt {
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
function R(s) {
  return (...t) => new s(...t);
}
const yt = {
  Commands: R(ft),
  Query: R(O),
  Res: R(k),
  World: R(gt)
};
function wt(s, t) {
  return {
    fn: t,
    parameters: s
  };
}
function* C(s) {
  let t = 0;
  for (; s !== 0n; )
    (s & 1n) === 1n && (yield t), s >>= 1n, t++;
}
function pt(s, t, e) {
  const i = Array.from({ length: s.length }, () => 0n), n = (r, o) => (i[r] & 1n << BigInt(o)) !== 0n;
  return t.forEach((r, o) => {
    if (!!r) {
      for (const a of r.before ?? []) {
        const h = s.indexOf(a);
        h !== -1 && (m(
          !n(o, h),
          `Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[h].fn.name} (${h}) depend on each other.`
        ), i[h] |= 1n << BigInt(o));
      }
      for (const a of r.after ?? []) {
        const h = s.indexOf(a);
        h !== -1 && (m(
          !n(h, o),
          `Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[h].fn.name} (${h}) depend on each other.`
        ), i[o] |= 1n << BigInt(h));
      }
    }
  }), i.forEach((r, o) => {
    m(
      !n(o, o),
      `Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[o].fn.name} (${o}) depend on each other.`
    );
  }), t.forEach((r, o) => {
    if (!!r) {
      if (r.beforeAll)
        for (const a of C(e[o]))
          a !== o && (i[o] & 1n << BigInt(a)) === 0n && (i[a] |= 1n << BigInt(o));
      if (r.afterAll)
        for (const a of C(e[o]))
          a !== o && (i[a] & 1n << BigInt(o)) === 0n && (i[o] |= 1n << BigInt(a));
    }
  }), i.forEach((r, o) => i[o] &= e[o]), i;
}
function At(s, t) {
  return s.parameters.some(
    (e) => t.parameters.some(
      (i) => e.intersectsWith(i) || i.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function bt(s) {
  return s.map(
    (t) => s.reduce(
      (e, i, n) => e | BigInt(At(t, i)) << BigInt(n),
      0n
    )
  );
}
const St = (s, t) => {
  for (const [e, i] of t) {
    const n = s.get(e);
    n === void 0 ? s.set(e, i) : n !== 0n && s.set(e, n | i);
  }
  return s;
}, Bt = wt([yt.World()], async function(t) {
  const e = (await t.threads.send(
    "thyseus::getCommandQueue"
  )).reduce(St, t.commands.queue);
  for (const [i, n] of e)
    t.moveEntity(i, n);
  e.clear();
});
class zt {
  #t = [];
  #e = [];
  #s = [];
  #i = it();
  #n = /* @__PURE__ */ new Set();
  #r = /* @__PURE__ */ new Set();
  #o;
  #a;
  constructor(t, e) {
    this.#o = t, this.#a = e, this.registerComponent(A), this.addSystem(Bt, { afterAll: !0 });
  }
  get resources() {
    return this.#r;
  }
  get components() {
    return this.#n;
  }
  get config() {
    return this.#o;
  }
  get url() {
    return this.#a;
  }
  addSystem(t, e) {
    return this.#t.push(t), this.#e.push(e), this.#h(t), this;
  }
  addStartupSystem(t) {
    return this.#s.push(t), this.#h(t), this;
  }
  addPlugin(t) {
    return t(this), this;
  }
  registerComponent(t) {
    return this.#n.add(t), this;
  }
  registerResource(t) {
    return this.#r.add(t), this;
  }
  registerSendableClass(t) {
    return z(t) && this.#i.push(t), this;
  }
  async build() {
    const t = p.spawn(
      this.#o.threads - 1,
      this.#a,
      this.#i
    ), e = await t.sendOrReceive(() => {
      const h = bt(this.#t), u = pt(
        this.#t,
        this.#e,
        h
      ), d = this.#t.reduce(
        (l, b, y) => b.parameters.some((S) => S.isLocalToThread()) ? l.add(y) : l,
        /* @__PURE__ */ new Set()
      );
      return _.from(h, u, d);
    }), i = j(
      this.#r,
      await t.sendOrReceive(
        () => Array.from(
          this.#r,
          (h) => z(h) ? x(h, this.#o) : null
        )
      )
    );
    p.isMainThread && this.#r.forEach((h) => {
      z(h) || i.set(
        h,
        x(h, this.#o)
      );
    });
    const n = await T.fromWorld(this.#o), r = new at(n, this.#n);
    t.setListener("thyseus::getCommandQueue", () => {
      const h = new Map(r.queue);
      return r.queue.clear(), h;
    });
    const o = [], a = new Et(
      this.#o,
      i,
      t,
      o,
      e,
      r,
      n,
      [...this.#n]
    );
    if (this.#t.forEach(
      (h, u) => o[u] = this.#c(h, a)
    ), p.isMainThread)
      for (const { execute: h, args: u } of this.#s.map(
        (d) => this.#c(d, a)
      ))
        h(...u);
    return await t.sendOrReceive(() => 0), a;
  }
  #h(t) {
    t.parameters.forEach((e) => e.onAddSystem(this));
  }
  #c({ fn: t, parameters: e }, i) {
    return {
      execute: t,
      args: e.map((n) => n.intoArgument(i))
    };
  }
}
const It = (s = {}) => ({
  threads: 1,
  maxEntities: 2 ** 16,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...s
}), Rt = ({ threads: s, maxEntities: t, getNewTableSize: e }, i) => {
  s > 1 && (m(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), m(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), m(
    i,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), m(
    Number.isInteger(s) && 0 < s && s < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  ), m(
    Number.isInteger(t) && 0 < t && t < 2 ** 32,
    "Invalid config - 'maxEntities' must be an integer such that 0 < maxEntities < 2**32",
    RangeError
  );
};
function Ct(s, t) {
  const e = It(s);
  return Rt(e, t), e;
}
const $ = "thyseus::newTable", N = "thyseus::growTable";
class Et {
  static new(t, e) {
    return new zt(Ct(t, e), e);
  }
  archetypes = /* @__PURE__ */ new Map();
  queries = [];
  config;
  resources;
  threads;
  #t;
  #e;
  commands;
  entities;
  components;
  constructor(t, e, i, n, r, o, a, h) {
    this.config = t, this.resources = e, this.threads = i, this.#t = n, this.#e = r, this.commands = o, this.entities = a, this.components = h, this.threads.setListener(
      $,
      ([u, d, l]) => {
        const b = j(
          [...C(u)].map((S) => this.components[S]),
          d
        ), y = new W(b, l);
        this.archetypes.set(u, y);
        for (const S of this.queries)
          S.testAdd(u, y);
      }
    ), this.threads.setListener(
      N,
      ([u, d]) => {
        const l = this.archetypes.get(u);
        let b = 0;
        for (const y of l.columns.keys())
          l.columns.set(y, d[b++]);
      }
    ), this.#e.onReady(() => this.#r());
  }
  moveEntity(t, e) {
    const i = this.entities.getTableId(t), n = this.archetypes.get(i);
    if (e === 0n) {
      this.#s(t);
      return;
    }
    const r = this.#i(e);
    r.isFull && this.#n(e, r), n ? (this.entities.setLocation(
      n.columns.get(A)[n.size - 1],
      i,
      this.entities.getRow(t)
    ), n.move(this.entities.getRow(t), r)) : r.add(t), this.entities.setLocation(
      t,
      e,
      r.size - 1
    );
  }
  #s(t) {
    const e = this.entities.getTableId(t), i = this.archetypes.get(e);
    if (i) {
      const n = this.entities.getRow(t);
      this.entities.setLocation(
        i.columns.get(A)?.val?.[i.size - 1],
        e,
        n
      ), i.delete(this.entities.getRow(t));
    }
    this.entities.setLocation(t, 0n, 0);
  }
  #i(t) {
    if (!this.archetypes.has(t)) {
      const e = W.create(
        [...C(t)].map((i) => this.components[i]),
        this.config.getNewTableSize(0)
      );
      this.threads.send($, [
        t,
        [...e.columns.values()],
        e.meta
      ]), this.archetypes.set(t, e);
      for (const i of this.queries)
        i.testAdd(t, e);
    }
    return this.archetypes.get(t);
  }
  #n(t, e) {
    e.grow(this.config), this.threads.send(N, [
      t,
      [...e.columns.values()],
      e.meta
    ]);
  }
  async update() {
    this.#e.reset(), this.#e.start();
  }
  async #r() {
    for await (const t of this.#e) {
      const e = this.#t[t];
      e.execute(...e.args);
    }
    this.#e.onReady(() => this.#r());
  }
}
function Lt(s) {
  return s;
}
export {
  Ut as Component,
  A as Entity,
  L as Mut,
  yt as P,
  Tt as Resource,
  c as ThreadProtocol,
  f as Type,
  Bt as applyCommands,
  Et as default,
  Lt as definePlugin,
  wt as defineSystem
};
