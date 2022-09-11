var q = (e, t, s) => {
  if (!t.has(e))
    throw TypeError("Cannot " + s);
}, y = (e, t, s) => (q(e, t, "read from private field"), s ? s.call(e) : t.get(e)), k = (e, t, s) => {
  if (t.has(e))
    throw TypeError("Cannot add the same private member more than once");
  t instanceof WeakSet ? t.add(e) : t.set(e, s);
}, v = (e, t, s, i) => (q(e, t, "write to private field"), i ? i.call(e, s) : t.set(e, s), s), g, w;
const D = "@IS_SENT_BY_THREAD", G = Symbol(), H = Symbol(), u = {
  Send: G,
  Receive: H
}, L = class {
  constructor(e, t) {
    k(this, g, void 0), k(this, w, void 0), v(this, g, e), v(this, w, t);
  }
  static spawn(e, t, s) {
    return !t || e === 0 ? [] : L.Context.Main ? Array.from(
      { length: e },
      () => new this(new Worker(t, { type: "module" }), s)
    ) : [new this(globalThis, s)];
  }
  static execute(e, t) {
    e && t();
  }
  static async createOrReceive(e, t, s) {
    if (e) {
      const i = s();
      return t.forEach((r) => r.send(i)), i;
    } else
      return (await Promise.all(
        t.map((r) => r.receive())
      ))[0];
  }
  send(e) {
    return y(this, g).postMessage(_(e, y(this, w))), this;
  }
  receive(e = 3e3) {
    return new Promise((t, s) => {
      let i = setTimeout(() => {
        s("Timed out."), y(this, g).removeEventListener("message", r);
      }, e);
      const r = (o) => {
        clearTimeout(i), t(R(o.data, y(this, w))), y(this, g).removeEventListener("message", r);
      };
      y(this, g).addEventListener("message", r);
    });
  }
};
let c = L;
g = /* @__PURE__ */ new WeakMap();
w = /* @__PURE__ */ new WeakMap();
c.Context = {
  Main: !!globalThis.document,
  Worker: !globalThis.document
};
function A(e) {
  return typeof e == "function" && u.Receive in e && u.Send in e.prototype;
}
function Y(e) {
  return u.Send in e;
}
function J(e) {
  return Array.isArray(e) && e.length === 3 && e[0] === D;
}
function _(e, t) {
  if (typeof e != "object" || e === null)
    return e;
  if (Y(e))
    return [
      D,
      t.indexOf(Object.getPrototypeOf(e).constructor),
      _(e[u.Send](), t)
    ];
  for (const s in e)
    e[s] = _(e[s], t);
  return e;
}
function R(e, t) {
  if (typeof e != "object" || e === null || e instanceof Object.getPrototypeOf(Uint8Array) || e instanceof DataView || e instanceof ArrayBuffer || typeof SharedArrayBuffer !== void 0 && e instanceof SharedArrayBuffer)
    return e;
  if (J(e)) {
    const [, s, i] = e, r = R(i, t);
    return t[s][u.Receive](r);
  }
  for (const s in e)
    e[s] = R(e[s], t);
  return e;
}
const S = 0b11111111n;
class M {
  static with(t, s, i = !1) {
    const r = i ? SharedArrayBuffer : ArrayBuffer;
    return new this(
      t,
      s,
      new Uint8Array(new r(Math.ceil(t / 8) * s))
    );
  }
  #t;
  #e;
  constructor(t, s, i) {
    this.width = t, this.length = s, this.#e = i, this.#t = Math.ceil(this.width / 8);
  }
  get bytesPerElement() {
    return this.#t;
  }
  get byteLength() {
    return this.#e.byteLength;
  }
  get(t) {
    let s = 0n;
    const i = this.#t * t;
    for (let r = 0; r < this.#t; r++)
      s |= BigInt(this.#e[i + r]) << BigInt(r * 8);
    return s;
  }
  set(t, s) {
    const i = this.#t * t;
    for (let r = 0; r < this.#t; r++)
      this.#e[i + r] = Number(s >> BigInt(r * 8) & S);
  }
  OR(t, s) {
    const i = this.#t * t;
    for (let r = 0; r < this.#t; r++)
      this.#e[i + r] |= Number(s >> BigInt(r * 8) & S);
  }
  AND(t, s) {
    const i = this.#t * t;
    for (let r = 0; r < this.#t; r++)
      this.#e[i + r] &= Number(s >> BigInt(r * 8) & S);
  }
  XOR(t, s) {
    const i = this.#t * t;
    for (let r = 0; r < this.#t; r++)
      this.#e[i + r] ^= Number(s >> BigInt(r * 8) & S);
  }
  [u.Send]() {
    return [this.width, this.length, this.#e];
  }
  static [u.Receive]([
    t,
    s,
    i
  ]) {
    return new this(t, s, i);
  }
}
function m(e, t, s = Error) {
  if (!e)
    throw new s(t);
}
class P {
  #t;
  #e;
  constructor(t, s = new Int32Array(new SharedArrayBuffer(4))) {
    this.#t = t, this.#e = s;
  }
  get isLocked() {
    return this.#e[0] === 1;
  }
  UNSAFE_getData() {
    return this.#t;
  }
  async request(t) {
    await this.#r();
    const s = await t(this.#t);
    return this.#s(), s;
  }
  async #r() {
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
  #s() {
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
  [u.Send]() {
    return [this.#t, this.#e];
  }
  static [u.Receive]([t, s]) {
    return new this(t, s);
  }
}
class C {
  static with(t, s = !1) {
    const i = s ? SharedArrayBuffer : ArrayBuffer;
    return new this(
      new Uint32Array(new i(t * 4)),
      new Uint32Array(new i(t * 4)),
      new Uint32Array(new i(4))
    );
  }
  #t;
  constructor(t, s, i) {
    this.sparse = t, this.dense = s, this.#t = i;
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
    const s = this.sparse[t];
    return this.dense[s] = this.dense[this.size], this.sparse[this.dense[s]] = s, !0;
  }
  clear() {
    this.size = 0;
  }
  *[Symbol.iterator]() {
    const t = this.size;
    for (let s = 0; s < t; s++)
      yield this.dense[s];
  }
  [u.Send]() {
    return [this.sparse, this.dense, this.#t];
  }
  static [u.Receive]([
    t,
    s,
    i
  ]) {
    return new this(t, s, i);
  }
}
class N {
  static from(t, s, i) {
    return new this(
      t,
      s,
      C.with(t.length, !0),
      new P(M.with(t.length, 2, !0)),
      i
    );
  }
  #t;
  #e;
  #r;
  #s;
  #i;
  #n;
  constructor(t, s, i, r, o) {
    this.#e = t, this.#r = s, this.#s = i, this.#i = r, this.#t = new Int32Array(
      i[u.Send]()[2].buffer
    ), this.#n = o;
  }
  add(t) {
    this.#s.add(t);
  }
  start() {
    Atomics.notify(this.#t, 0);
  }
  reset() {
    const t = this.#i.UNSAFE_getData();
    t.set(0, 0n), t.set(1, 0n);
    for (let s = 0; s < this.#r.length; s++)
      this.#n.has(s) || this.#s.add(s);
  }
  async onReady(t) {
    const { async: s, value: i } = Atomics.waitAsync(this.#t, 0, 0);
    if (!s)
      throw new Error(
        "Trying to wait while there are still systems to execute"
      );
    await i, t();
  }
  async *[Symbol.asyncIterator]() {
    const t = new Set(this.#n);
    for (; this.#s.size + t.size > 0; ) {
      const s = this.#s.size;
      let i = -1;
      await this.#i.request((r) => {
        const o = r.get(0), n = r.get(1);
        for (const a of [...t, ...this.#s])
          if ((o & this.#e[a]) === 0n && (n & this.#r[a]) === this.#r[a]) {
            i = a, this.#s.delete(a), t.delete(a), r.OR(0, 1n << BigInt(a));
            break;
          }
      }), i > -1 ? (yield i, await this.#i.request((r) => {
        r.XOR(0, 1n << BigInt(i)), r.OR(1, 1n << BigInt(i)), (this.#t[0] !== 0 || this.#t[0] === 0 && r.get(0) === 0n) && Atomics.notify(this.#t, 0);
      })) : s !== 0 && await Atomics.waitAsync(this.#t, 0, s).value;
    }
  }
  [u.Send]() {
    return [
      this.#e,
      this.#r,
      this.#s,
      this.#i
    ];
  }
  static [u.Receive](t) {
    return new this(...t, /* @__PURE__ */ new Set());
  }
}
const Z = (e) => (e >>>= 0, 31 - Math.clz32(e & -e));
class T {
  #t;
  #e;
  static with(t, s) {
    const i = s ? SharedArrayBuffer : ArrayBuffer;
    return new this(
      new Uint32Array(new i(16)),
      new Uint32Array(new i(t))
    );
  }
  constructor(t, s) {
    this.#t = t, this.#e = s;
  }
  get() {
    for (let s = 0; s < this.#e.length && Atomics.load(this.#t, 1) !== 0; s++)
      for (; ; ) {
        const i = Atomics.load(this.#e, s);
        if (i === 0)
          break;
        const r = Z(i);
        if (Atomics.xor(this.#e, s, 1 << r) === i)
          return Atomics.sub(this.#t, 1, 1), 32 * s + r;
      }
    const t = Atomics.add(this.#t, 0, 1);
    if (t === 4294967295)
      throw new Error("Too many entities spawned!");
    return t;
  }
  free(t) {
    (Atomics.or(this.#e, t >> 5, 1 << (t & 31)) & 1 << (t & 31)) === 0 && Atomics.add(this.#t, 1, 1);
  }
  [u.Send]() {
    return [this.#t, this.#e];
  }
  static [u.Receive]([t, s]) {
    return new this(t, s);
  }
}
function tt() {
  return [C, P, M, N, T];
}
function E(e, t) {
  const s = [...t];
  return [...e].reduce(
    (i, r, o) => i.set(r, s[o]),
    /* @__PURE__ */ new Map()
  );
}
class et {
  static fromWorld(t, s) {
    return new this(
      T.with(t.maxEntities, t.threads > 1),
      M.with(
        s,
        t.maxEntities,
        t.threads > 1
      ),
      C.with(t.maxEntities, t.threads > 1)
    );
  }
  #t;
  #e;
  constructor(t, s, i) {
    this.#e = t, this.entityData = s, this.#t = new st(
      this,
      s,
      i
    ), this.modifiedEntities = i;
  }
  __$$setComponents(t) {
    this.#t.__$$setComponents(t);
  }
  spawn() {
    return this.#t.__$$setId(this.#e.get());
  }
  despawn(t) {
    return this.#e.free(t), this.entityData.set(t, 0n), this.modifiedEntities.add(t), this;
  }
  get(t) {
    return this.#t.__$$setId(t);
  }
  [u.Send]() {
    return [this.#e, this.entityData, this.modifiedEntities];
  }
  static [u.Receive]([
    t,
    s,
    i
  ]) {
    return new this(t, s, i);
  }
}
class st {
  __$$setId(t) {
    return this.#t = t, this;
  }
  __$$setComponents(t) {
    this.#e = t;
  }
  #t = 0;
  #e;
  #r;
  #s;
  #i;
  constructor(t, s, i) {
    this.#r = t, this.#e = null, this.#s = s, this.#i = i;
  }
  initialize(t) {
    const s = b(this.#e, t);
    return (this.#s.get(this.#t) & 1n << BigInt(s)) === 0n && this.insert(t), this;
  }
  insert(t) {
    return this.#s.OR(
      this.#t,
      1n << BigInt(b(this.#e, t))
    ), this.#i.add(this.#t), this;
  }
  remove(t) {
    return this.#s.XOR(
      this.#t,
      1n << BigInt(b(this.#e, t))
    ), this.#i.add(this.#t), this;
  }
  despawn() {
    this.#r.despawn(this.#t);
  }
}
function b(e, t) {
  return [...e.keys()].indexOf(t);
}
function Ct(e) {
  var t;
  if (!e)
    return t = class {
    }, t.schema = {}, t;
  class s {
    constructor(r, o) {
      this.$ = r, this._ = o;
    }
  }
  s.schema = e;
  for (const i in e) {
    const r = Array.isArray(e) ? Number(i) : i;
    Object.defineProperty(s.prototype, r, {
      enumerable: !0,
      get() {
        return this.$[r][this._];
      },
      set(o) {
        this.$[r][this._] = o;
      }
    });
  }
  return s;
}
var f = /* @__PURE__ */ ((e) => (e[e.u8 = 0] = "u8", e[e.u16 = 1] = "u16", e[e.u32 = 2] = "u32", e[e.u64 = 3] = "u64", e[e.i8 = 4] = "i8", e[e.i16 = 5] = "i16", e[e.i32 = 6] = "i32", e[e.i64 = 7] = "i64", e[e.f32 = 8] = "f32", e[e.f64 = 9] = "f64", e))(f || {});
const F = {
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
}, it = {
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
function rt(e, { maxEntities: t, threads: s }) {
  const i = s > 1, r = Q(e.schema), o = new (i ? SharedArrayBuffer : ArrayBuffer)(r * t);
  return V(e.schema, o, [0], t);
}
const Q = (e) => (Array.isArray(e) ? e : Object.values(e)).reduce(
  (t, s) => t + (typeof s == "number" ? F[s] : Q(s.schema)),
  0
), V = (e, t, s, i) => {
  const r = Array.isArray(e);
  return Object.entries(e).reduce((o, [n, a], d) => {
    const h = r ? d : n;
    return typeof a == "number" ? (o[h] = new it[a](t, s[0], i), s[0] += i * F[a]) : o[h] = V(a.schema, t, s, i), o;
  }, r ? [] : {});
};
f.u8 + "", f.u16 + "", f.u32 + "", f.u64 + "", f.i8 + "", f.i16 + "", f.i32 + "", f.i64 + "", f.f32 + "", f.f64 + "";
function z(e, t) {
  return nt(e) ? e.create(t) : new e();
}
function nt(e) {
  return "create" in e && typeof e.create == "function";
}
class ot {
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
var l = /* @__PURE__ */ ((e) => (e[e.Read = 0] = "Read", e[e.Write = 1] = "Write", e))(l || {});
function at(e, t) {
  return ht(e, t);
}
const ht = (e, t) => t.reduce(
  (s, i) => s | 1n << BigInt(e.indexOf(i)),
  0n
);
function $(e) {
  return [e, 1];
}
$.isMut = function(e) {
  return Array.isArray(e) && e.length === 2 && typeof e[0] == "function" && e[1] === 1;
};
class ct {
  #t;
  #e;
  #r;
  #s;
  constructor(t, s, i, r) {
    this.entities = i, this.#e = t, this.#r = s, this.#t = this.#e.map(
      (o, n) => new o(this.#r[n], 0)
    ), this.#s = r;
  }
  *[Symbol.iterator]() {
    for (const t of this.entities) {
      for (const s of this.#t)
        s.eid = t;
      yield this.#t;
    }
  }
  testAdd(t, s) {
    this.#i(s) && this.entities.add(t);
  }
  #i(t) {
    return (t & this.#s) === this.#s;
  }
}
class x {
  constructor(t) {
    this.components = [], this.accessType = [];
    for (const s of t) {
      const i = $.isMut(s);
      this.components.push(i ? s[0] : s), this.accessType.push(i ? l.Write : l.Read);
    }
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof x ? this.components.some(
      (s, i) => t.components.some(
        (r, o) => s === r && (this.accessType[i] === l.Write || t.accessType[o] === l.Write)
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((s) => t.registerComponent(s)), t.registerQuery(this);
  }
  intoArgument(t) {
    return t.queries.set(
      this,
      new ct(
        this.components,
        this.components.map((s) => t.components.get(s)),
        t.queries.get(this),
        at([...t.components.keys()], this.components)
      )
    ), t.queries.get(this);
  }
}
class W {
  constructor(t) {
    const s = $.isMut(t);
    this.resource = s ? t[0] : t, this.accessType = s ? l.Write : l.Read;
  }
  isLocalToThread() {
    return !A(this.resource);
  }
  intersectsWith(t) {
    return t instanceof W ? this.resource === t.resource && (this.accessType === l.Write || t.accessType === l.Write) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource), A(this.resource) && t.registerSendableClass(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class ut {
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
function B(e) {
  return (...t) => new e(...t);
}
const dt = {
  Commands: B(ot),
  Query: B(x),
  Res: B(W),
  World: B(ut)
};
function ft(e, t) {
  return {
    fn: t,
    parameters: e
  };
}
function mt(e, t, s) {
  const i = Array.from({ length: e.length }, () => 0n), r = (o, n) => (i[o] & 1n << BigInt(n)) !== 0n;
  return t.forEach((o, n) => {
    if (!!o) {
      for (const a of o.before ?? []) {
        const d = e.indexOf(a);
        d !== -1 && (m(
          !r(n, d),
          `Circular dependency detected: ${e[n].fn.name} (${n}) and ${e[d].fn.name} (${d}) depend on each other.`
        ), i[d] |= 1n << BigInt(n));
      }
      for (const a of o.after ?? []) {
        const d = e.indexOf(a);
        d !== -1 && (m(
          !r(d, n),
          `Circular dependency detected: ${e[n].fn.name} (${n}) and ${e[d].fn.name} (${d}) depend on each other.`
        ), i[n] |= 1n << BigInt(d));
      }
    }
  }), i.forEach((o, n) => {
    m(
      !r(n, n),
      `Circular dependency detected: ${e[n].fn.name} (${n}) and ${e[n].fn.name} (${n}) depend on each other.`
    );
  }), t.forEach((o, n) => {
    if (!!o) {
      if (o.beforeAll)
        for (const a of U(s[n]))
          a !== n && (i[n] & 1n << BigInt(a)) === 0n && (i[a] |= 1n << BigInt(n));
      if (o.afterAll)
        for (const a of U(s[n]))
          a !== n && (i[a] & 1n << BigInt(n)) === 0n && (i[n] |= 1n << BigInt(a));
    }
  }), i.forEach((o, n) => i[n] &= s[n]), i;
}
function* U(e) {
  let t = 0;
  for (; e !== 0n; )
    (e & 1n) === 1n && (yield t), e >>= 1n, t++;
}
function lt(e, t) {
  return e.parameters.some(
    (s) => t.parameters.some(
      (i) => s.intersectsWith(i) || i.intersectsWith(s)
    )
  ) ? 1 : 0;
}
function gt(e) {
  return e.map(
    (t) => e.reduce(
      (s, i, r) => s | BigInt(lt(t, i)) << BigInt(r),
      0n
    )
  );
}
const yt = ft([dt.World()], function(t) {
  for (const s of t.commands.modifiedEntities)
    for (const i of t.queries.values())
      i.testAdd(s, t.commands.entityData.get(s));
  t.commands.modifiedEntities.clear();
});
class pt {
  #t = [];
  #e = [];
  #r = [];
  #s = tt();
  #i = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Set();
  #a = /* @__PURE__ */ new Set();
  #o;
  #h;
  constructor(t, s) {
    this.#o = t, this.#h = s, this.addSystem(yt, { afterAll: !0 });
  }
  get resources() {
    return this.#i;
  }
  get queries() {
    return this.#n;
  }
  get components() {
    return this.#a;
  }
  get config() {
    return this.#o;
  }
  get url() {
    return this.#h;
  }
  addSystem(t, s) {
    return this.#t.push(t), this.#e.push(s), this.#c(t), this;
  }
  addStartupSystem(t) {
    return this.#r.push(t), this.#c(t), this;
  }
  addPlugin(t) {
    return t(this), this;
  }
  registerComponent(t) {
    return this.#a.add(t), this;
  }
  registerResource(t) {
    return this.#i.add(t), this;
  }
  registerSendableClass(t) {
    return A(t) && this.#s.push(t), this;
  }
  registerQuery(t) {
    return this.#n.add(t), this;
  }
  async build() {
    const t = c.spawn(
      this.#o.threads - 1,
      this.#h,
      this.#s
    ), s = await c.createOrReceive(
      c.Context.Main,
      t,
      () => {
        const h = gt(this.#t), p = mt(
          this.#t,
          this.#e,
          h
        ), I = this.#t.reduce((O, X, K) => (X.parameters.some((j) => j.isLocalToThread()) && O.add(K), O), /* @__PURE__ */ new Set());
        return N.from(h, p, I);
      }
    ), i = E(
      this.#a,
      await c.createOrReceive(
        c.Context.Main,
        t,
        () => Array.from(
          this.#a,
          (h) => rt(h, this.#o)
        )
      )
    ), r = E(
      this.#i,
      await c.createOrReceive(
        c.Context.Main,
        t,
        () => Array.from(
          this.#i,
          (h) => A(h) ? z(h, this.#o) : null
        )
      )
    );
    c.execute(c.Context.Main, () => {
      this.#i.forEach((h) => {
        A(h) || r.set(
          h,
          z(h, this.#o)
        );
      });
    });
    const o = E(
      this.#n,
      await c.createOrReceive(
        c.Context.Main,
        t,
        () => Array.from(
          this.#n,
          () => C.with(
            this.#o.maxEntities,
            this.#o.threads > 1
          )
        )
      )
    ), n = await c.createOrReceive(
      c.Context.Main,
      t,
      () => et.fromWorld(this.#o, i.size)
    );
    n.__$$setComponents(i);
    const a = [], d = new Bt(
      i,
      r,
      o,
      t,
      a,
      s,
      n
    );
    return this.#t.forEach(
      (h, p) => a[p] = this.#u(h, d)
    ), c.execute(c.Context.Main, () => {
      for (const { execute: h, args: p } of this.#r.map(
        (I) => this.#u(I, d)
      ))
        h(...p);
    }), await c.createOrReceive(c.Context.Worker, t, () => 0), d;
  }
  #c(t) {
    t.parameters.forEach((s) => s.onAddSystem(this));
  }
  #u({ fn: t, parameters: s }, i) {
    return {
      execute: t,
      args: s.map((r) => r.intoArgument(i))
    };
  }
}
function wt(e = {}) {
  return {
    threads: 1,
    maxEntities: 2 ** 16,
    ...e
  };
}
function At(e, t) {
  const { threads: s, maxEntities: i } = e;
  s > 1 && (m(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), m(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), m(
    t,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter."
  )), m(
    s > 0 && Number.isSafeInteger(s),
    "Invalid config - 'threads' must be a safe, positive integer (min 1)."
  ), m(
    i > 0 && Number.isSafeInteger(i),
    "Invalid config - 'maxEntities' must be a safe, positive integer."
  );
}
function St(e, t) {
  const s = wt(e);
  return At(s, t), s;
}
class Bt {
  static new(t, s) {
    return new pt(St(t, s), s);
  }
  #t;
  #e;
  #r;
  #s;
  #i;
  #n;
  #a;
  constructor(t, s, i, r, o, n, a) {
    this.#t = t, this.#e = s, this.#r = i, this.#i = o, this.#s = r, this.#n = n, this.#a = a, this.#n.onReady(() => this.#o());
  }
  get threads() {
    return this.#s;
  }
  get resources() {
    return this.#e;
  }
  get queries() {
    return this.#r;
  }
  get components() {
    return this.#t;
  }
  get commands() {
    return this.#a;
  }
  async update() {
    this.#n.reset(), this.#n.start();
  }
  async #o() {
    for await (const t of this.#n) {
      const s = this.#i[t];
      s.execute(...s.args);
    }
    this.#n.onReady(() => this.#o());
  }
}
function It(e) {
  return e;
}
export {
  Ct as Component,
  $ as Mut,
  dt as P,
  u as ThreadProtocol,
  f as Type,
  yt as applyCommands,
  Bt as default,
  It as definePlugin,
  ft as defineSystem
};
