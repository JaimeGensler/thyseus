var L = (s, t, e) => {
  if (!t.has(s))
    throw TypeError("Cannot " + e);
}, v = (s, t, e) => (L(s, t, "read from private field"), e ? e.call(s) : t.get(s)), F = (s, t, e) => {
  if (t.has(s))
    throw TypeError("Cannot add the same private member more than once");
  t instanceof WeakSet ? t.add(s) : t.set(s, e);
}, Y = (s, t, e, i) => (L(s, t, "write to private field"), i ? i.call(s, e) : t.set(s, e), e), m;
const E = "@IS_SENT_BY_THREAD", B = class extends Worker {
  constructor(s, t) {
    super(s, { type: "module" }), F(this, m, []), Y(this, m, t);
  }
  static send(s) {
    return globalThis.postMessage(S(s, this.globalSendableTypes)), this;
  }
  static receive(s = 3e3) {
    return new Promise((t, e) => {
      let i = setTimeout(() => {
        e("Timed out."), globalThis.removeEventListener("message", n);
      }, s);
      const n = (r) => {
        clearTimeout(i), t(b(r.data, this.globalSendableTypes)), globalThis.removeEventListener("message", n);
      };
      globalThis.addEventListener("message", n);
    });
  }
  static isSendableClass(s) {
    return typeof s == "function" && B.Receive in s && B.Send in s.prototype;
  }
  send(s) {
    return super.postMessage(S(s, v(this, m))), this;
  }
  receive(s = 3e3) {
    return new Promise((t, e) => {
      let i = setTimeout(() => {
        e("Timed out."), this.removeEventListener("message", n);
      }, s);
      const n = (r) => {
        clearTimeout(i), t(b(r.data, v(this, m))), this.removeEventListener("message", n);
      };
      this.addEventListener("message", n);
    });
  }
};
let c = B;
m = /* @__PURE__ */ new WeakMap();
c.Send = Symbol();
c.Receive = Symbol();
c.globalSendableTypes = [];
function G(s) {
  return c.Send in s;
}
function H(s) {
  return E in s;
}
function S(s, t) {
  if (typeof s != "object" || s === null)
    return s;
  if (G(s))
    return {
      [E]: [
        t.indexOf(Object.getPrototypeOf(s).constructor),
        S(s[c.Send](), t)
      ]
    };
  for (const e in s)
    s[e] = S(s[e], t);
  return s;
}
function b(s, t) {
  if (typeof s != "object" || s === null)
    return s;
  if (H(s)) {
    const [e, i] = s[E], n = b(i, t);
    return t[e][c.Receive](n);
  }
  for (const e in s)
    s[e] = b(s[e], t);
  return s;
}
const w = 0b11111111n;
class z {
  #t;
  #e;
  get bytesPerElement() {
    return this.#e;
  }
  get byteLength() {
    return this.#t.byteLength;
  }
  static with(t, e, i = !1) {
    const n = i ? SharedArrayBuffer : ArrayBuffer;
    return new this(t, e, new Uint8Array(new n(Math.ceil(t / 8) * e)));
  }
  constructor(t, e, i) {
    this.width = t, this.length = e, this.#t = i, this.#e = Math.ceil(this.width / 8);
  }
  get(t) {
    let e = 0n;
    const i = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      e |= BigInt(this.#t[i + n]) << BigInt(n * 8);
    return e;
  }
  set(t, e) {
    const i = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      this.#t[i + n] = Number(e >> BigInt(n * 8) & w);
  }
  orEquals(t, e) {
    const i = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      this.#t[i + n] |= Number(e >> BigInt(n * 8) & w);
  }
  andEquals(t, e) {
    const i = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      this.#t[i + n] &= Number(e >> BigInt(n * 8) & w);
  }
  xorEquals(t, e) {
    const i = this.#e * t;
    for (let n = 0; n < this.#e; n++)
      this.#t[i + n] ^= Number(e >> BigInt(n * 8) & w);
  }
  [c.Send]() {
    return [this.width, this.length, this.#t];
  }
  static [c.Receive]([t, e, i]) {
    return new this(t, e, i);
  }
}
function l(s, t, e = Error) {
  if (!s)
    throw new e(t);
}
class k {
  #t;
  constructor(t = new Int32Array(new SharedArrayBuffer(4))) {
    this.#t = t;
  }
  get isLocked() {
    return this.#t[0] === 1;
  }
  async acquire() {
    for (; ; ) {
      if (Atomics.compareExchange(this.#t, 0, 0, 1) === 0)
        return;
      await Atomics.waitAsync(this.#t, 0, 1).value;
    }
  }
  release() {
    const t = Atomics.compareExchange(this.#t, 0, 1, 0);
    Atomics.notify(this.#t, 0), l(t === 1, "Tried to unlock a mutex that was not locked.");
  }
  [c.Send]() {
    return this.#t;
  }
  static [c.Receive](t) {
    return new this(t);
  }
}
class T {
  #t;
  static with(t, e = !1) {
    const i = e ? SharedArrayBuffer : ArrayBuffer;
    return new this(new Uint32Array(new i(t * 4)), new Uint32Array(new i(t * 4)), new Uint32Array(new i(4)));
  }
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
class q {
  static from(t, e) {
    return new this(t, e, z.with(t.length, 2, !0), T.with(t.length, !0), new k());
  }
  #t;
  #e;
  #i;
  #s;
  #n;
  #r;
  constructor(t, e, i, n, r) {
    this.#t = t, this.#e = e, this.#i = i, this.#s = n, this.#n = r, this.#r = new Int32Array(n[c.Send]()[2].buffer);
  }
  add(t) {
    this.#s.add(t);
  }
  start() {
    Atomics.notify(this.#r, 0);
  }
  reset() {
    this.#i.set(0, 0n), this.#i.set(1, 0n);
  }
  async whenReady(t) {
    const { async: e, value: i } = Atomics.waitAsync(this.#r, 0, 0);
    if (!e)
      throw new Error("Trying to wait while there are still systems to execute");
    await i, t();
  }
  async allSystemsDone() {
    for (; ; ) {
      if (this.#i.get(1) === 0n)
        return;
      await Atomics.waitAsync(this.#r, 0, this.#r[0]).value;
    }
  }
  async *iter(t) {
    for (; this.#s.size + t.size > 0; ) {
      const e = this.#s.size;
      let i = -1;
      await this.#n.acquire();
      const n = this.#i.get(0), r = this.#i.get(1);
      for (const o of [...t, ...this.#s])
        if ((n & this.#t[o]) === 0n && (r & this.#e[o]) === this.#e[o]) {
          i = o, this.#s.delete(o), t.delete(o), this.#i.orEquals(0, 1n << BigInt(o));
          break;
        }
      this.#n.release(), i > -1 ? (yield i, await this.#n.acquire(), this.#i.xorEquals(0, 1n << BigInt(i)), this.#i.orEquals(1, 1n << BigInt(i)), this.#r[0] !== 0 && Atomics.notify(this.#r, 0), this.#n.release()) : e !== 0 && await Atomics.waitAsync(this.#r, 0, e).value;
    }
  }
  [c.Send]() {
    return [
      this.#t,
      this.#e,
      this.#i,
      this.#s,
      this.#n
    ];
  }
  static [c.Receive](t) {
    return new this(...t);
  }
}
const K = () => {
};
class V {
  #t = K;
  #e;
  constructor(t) {
    this.#e = t, this.#t;
  }
  add() {
  }
  reset() {
  }
  start() {
    this.#t(0);
  }
  allSystemsDone() {
    return Promise.resolve();
  }
  async whenReady(t) {
    await new Promise((e) => {
      this.#t = e;
    }), t();
  }
  async *iter() {
    for (const t of this.#e)
      yield t;
  }
}
function J(s, t) {
  return s.parameters.some((e) => t.find((i) => i.type === e.type).isLocalToThread(e));
}
const X = [T, k, z, q];
function O(s) {
  const t = [...X];
  for (const e of s)
    t.push(...e.extendSendable?.() ?? []);
  return t;
}
var f = /* @__PURE__ */ ((s) => (s[s.Disjoint = 0] = "Disjoint", s[s.Intersecting = 1] = "Intersecting", s))(f || {});
class Z {
  #t = 0;
  #e = [];
  #i = [];
  #s = /* @__PURE__ */ new Set();
  #n;
  #r;
  #o;
  constructor(t, e, i) {
    this.#n = t, this.#r = e, this.#o = i;
  }
  updateQueries() {
    for (const t of this.#s)
      for (const e of this.#o)
        e.testAdd(t, this.#i[t]);
    this.#s.clear();
  }
  spawn(...t) {
    const e = this.#e.pop() ?? this.#t++;
    return this.#i[e] = 0n, this.insert(e, ...t), e;
  }
  despawn(t) {
    this.#e.push(t), this.#s.add(t), this.#i[t] = 0n;
  }
  insert(t, ...e) {
    for (const i of e)
      this.#s.add(t), this.#i[t] |= 1n << BigInt(this.#r.indexOf(i));
  }
  remove(t, ...e) {
    for (const i of e)
      this.#s.add(t), this.#i[t] &= ~(1n << BigInt(this.#r.findIndex(i)));
  }
}
function tt(s, t) {
  return et(s, t);
}
const et = (s, t) => t.reduce((e, i) => e | 1n << BigInt(s.indexOf(i)), 0n);
function I(s) {
  return [s, 1];
}
function st(s) {
  return Array.isArray(s) && s.length === 2 && typeof s[0] == "function" && s[1] === 1;
}
I.is = st;
function y(s) {
  if (!s)
    return W;
  class t {
    constructor(i, n) {
      this.$ = i, this._ = n;
    }
  }
  t.schema = s;
  for (const e in s) {
    const i = Array.isArray(s) ? Number(e) : e;
    Object.defineProperty(t.prototype, i, {
      enumerable: !0,
      get() {
        return this.$[i][this._];
      },
      set(n) {
        this.$[i][this._] = n;
      }
    });
  }
  return t;
}
function it(s) {
  return typeof s == "function" && "schema" in s;
}
y.is = it;
class W {
  constructor(t, e) {
    throw new Error("Tried to construct a Tag Component!");
  }
}
W.schema = {};
var nt = /* @__PURE__ */ ((s) => (s[s.u8 = 0] = "u8", s[s.u16 = 1] = "u16", s[s.u32 = 2] = "u32", s[s.u64 = 3] = "u64", s[s.i8 = 4] = "i8", s[s.i16 = 5] = "i16", s[s.i32 = 6] = "i32", s[s.i64 = 7] = "i64", s[s.f32 = 8] = "f32", s[s.f64 = 9] = "f64", s))(nt || {});
const P = {
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
}, rt = {
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
function U(s, { maxCount: t, isShared: e }) {
  const i = $(s.schema), n = new (e ? SharedArrayBuffer : ArrayBuffer)(i * t);
  return N(s.schema, n, [0], t);
}
const $ = (s) => (Array.isArray(s) ? s : Object.values(s)).reduce((t, e) => t + (typeof e == "number" ? P[e] : $(e.schema)), 0), N = (s, t, e, i) => {
  const n = Array.isArray(s);
  return Object.entries(s).reduce((r, [o, h], a) => {
    const d = n ? a : o;
    return typeof h == "number" ? (r[d] = new rt[h](t, e[0], i), e[0] += i * P[h]) : r[d] = N(h.schema, t, e, i), r;
  }, n ? [] : {});
};
class ot {
  #t;
  #e;
  #i;
  #s;
  constructor(t, e, i, n) {
    this.entities = i, this.#e = t, this.#i = e, this.#t = this.#e.map((r, o) => new r(this.#i[o], 0)), this.#s = n;
  }
  *[Symbol.iterator]() {
    for (const t of this.entities) {
      for (const e of this.#t)
        e.eid = t;
      yield this.#t;
    }
  }
  testAdd(t, e) {
    this.#n(e) && this.entities.add(t);
  }
  #n(t) {
    return (t & this.#s) === this.#s;
  }
}
var u = /* @__PURE__ */ ((s) => (s[s.Read = 0] = "Read", s[s.Write = 1] = "Write", s))(u || {});
const C = Symbol();
class g {
  constructor(t) {
    this.queries = [], this.components = [], this.stores = [], this.#t = [], this.#e = 0, this.#i = 0, this.#s = t;
  }
  get type() {
    return C;
  }
  #t;
  #e;
  #i;
  #s;
  onAddSystem({ data: t }) {
    this.#e++;
    for (const e of t.components)
      this.components.includes(e) || this.components.push(e);
  }
  onBuildMainWorld() {
    for (const t of this.components)
      this.stores.push(U(t, {
        maxCount: this.#s.maxEntities,
        isShared: this.#s.threads > 1
      }));
    this.#t = Array.from({ length: this.#e }, () => T.with(256, this.#s.threads > 1));
  }
  onBuildSystem({ data: t }) {
    const e = new ot(t.components, this.stores.filter((i, n) => t.components.includes(this.components[n])), this.#t[this.#i++], tt(this.components, t.components));
    return this.queries.push(e), e;
  }
  sendToThread() {
    return [this.#t, this.stores];
  }
  receiveOnThread([t, e]) {
    this.#t = t, this.stores = e;
  }
  isLocalToThread() {
    return !1;
  }
  getRelationship(t, e) {
    const i = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
    for (let r = 0; r < t.data.components.length; r++) {
      const o = t.data.components[r];
      (t.data.accessType[r] === u.Read ? i : n).add(o);
    }
    for (let r = 0; r < e.data.components.length; r++) {
      const o = e.data.components[r], h = e.data.accessType[r];
      if (h === u.Read && n.has(o) || h === u.Write && (i.has(o) || n.has(o)))
        return f.Intersecting;
    }
    return f.Disjoint;
  }
  static createDescriptor(t) {
    return {
      type: C,
      data: t.reduce((e, i) => {
        const n = I.is(i);
        return e.components.push(n ? i[0] : i), e.accessType.push(n ? u.Write : u.Read), e;
      }, {
        components: [],
        accessType: []
      })
    };
  }
}
const Q = Symbol();
class p {
  constructor(t) {
    this.entityManager = null, this.#t = t;
  }
  get type() {
    return Q;
  }
  #t;
  onBuildMainWorld(t) {
    const e = t.find((i) => i instanceof g);
    this.entityManager = new Z(e.stores, e.components, e.queries);
  }
  onBuildSystem() {
    return this.entityManager;
  }
  isLocalToThread() {
    return !0;
  }
  getRelationship(t, e) {
    return f.Intersecting;
  }
  static createDescriptor() {
    return at;
  }
}
const at = { type: Q, data: null }, x = Symbol();
class A {
  get type() {
    return x;
  }
  #t = /* @__PURE__ */ new Map();
  #e = 0;
  #i = [];
  #s = [];
  #n = [];
  #r = [];
  #o;
  constructor(t) {
    this.#o = t;
  }
  onBuildMainWorld() {
    this.#i = this.#s.map((t) => U(t, {
      maxCount: 1,
      isShared: this.#o.threads > 1
    })), this.#r = this.#n.map((t) => new t());
  }
  onAddSystem({ data: { resource: t } }) {
    y.is(t) ? this.#s.push(t) : c.isSendableClass(t) && this.#n.push(t);
  }
  extendSendable() {
    return this.#n;
  }
  sendToThread() {
    return [this.#i, this.#r];
  }
  receiveOnThread([t, e]) {
    this.#i = t;
    for (const i of e)
      this.#t.set(i.constructor, i);
  }
  onBuildSystem({ data: { resource: t } }) {
    if (!globalThis.document && !(y.is(t) || c.isSendableClass(t)))
      return null;
    if (!this.#t.has(t)) {
      const e = y.is(t) ? [this.#i[this.#e++], 0] : [this.#o];
      this.#t.set(t, ht(t) ? t.create(...e) : new t(...e));
    }
    return this.#t.get(t);
  }
  isLocalToThread({ data: { resource: t } }) {
    return !(y.is(t) || c.isSendableClass(t));
  }
  getRelationship(t, e) {
    return t.data.resource !== e.data.resource || t.data.accessType === u.Read && e.data.accessType === u.Read ? f.Disjoint : f.Intersecting;
  }
  static createDescriptor(t) {
    const e = I.is(t);
    return {
      type: x,
      data: {
        resource: e ? t[0] : t,
        accessType: e ? u.Write : u.Read
      }
    };
  }
}
function ht(s) {
  return "create" in s;
}
const yt = {
  Entities: p.createDescriptor,
  Query: g.createDescriptor,
  Res: A.createDescriptor
};
function gt(s, t) {
  return {
    fn: t,
    parameters: s
  };
}
function ct(s, t, e) {
  const i = Array.from({ length: s.length }, () => 0n), n = (r, o) => (i[r] & 1n << BigInt(o)) !== 0n;
  return t.forEach((r, o) => {
    if (!!r) {
      for (const h of r.before ?? []) {
        const a = s.indexOf(h);
        a !== -1 && (l(!n(o, a), `Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[a].fn.name} (${a}) depend on each other.`), i[a] |= 1n << BigInt(o));
      }
      for (const h of r.after ?? []) {
        const a = s.indexOf(h);
        a !== -1 && (l(!n(a, o), `Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[a].fn.name} (${a}) depend on each other.`), i[o] |= 1n << BigInt(a));
      }
    }
  }), i.forEach((r, o) => {
    l(!n(o, o), `Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[o].fn.name} (${o}) depend on each other.`);
  }), t.forEach((r, o) => {
    if (!!r) {
      if (r.beforeAll)
        for (const h of _(e[o]))
          h !== o && (i[o] & 1n << BigInt(h)) === 0n && (i[h] |= 1n << BigInt(o));
      if (r.afterAll)
        for (const h of _(e[o]))
          h !== o && (i[h] & 1n << BigInt(o)) === 0n && (i[o] |= 1n << BigInt(h));
    }
  }), i.forEach((r, o) => i[o] &= e[o]), i;
}
function* _(s) {
  let t = 0;
  for (; s !== 0n; )
    (s & 1n) === 1n && (yield t), s >>= 1n, t++;
}
function dt(s, t, e) {
  for (const i of s.parameters)
    for (const n of t.parameters)
      if (i.type === n.type && e.find((r) => r.type === i.type)?.getRelationship(i, n) === f.Intersecting)
        return f.Intersecting;
  return f.Disjoint;
}
function ut(s, t) {
  return s.map((e) => s.reduce((i, n, r) => i | BigInt(dt(e, n, t)) << BigInt(r), 0n));
}
const ft = {
  threads: 1,
  maxEntities: 2 ** 16
};
function j({ threads: s, maxEntities: t }, e) {
  s > 1 && (l(isSecureContext && typeof SharedArrayBuffer < "u", "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer, which requires a secure context."), l(e, "Invalid config - Multithreading (threads > 1) requires a module URL parameter.")), l(s > 0 && Number.isSafeInteger(s), "Invalid config - 'threads' must be a safe, positive integer (min 1)."), l(t > 0 && Number.isSafeInteger(t), "Invalid config - 'maxEntities' must be a safe, positive integer.");
}
class lt {
  #t = [];
  #e = [];
  #i = [];
  #s;
  #n = [];
  #r;
  #o;
  constructor(t, e) {
    j(t, e), this.#r = t, this.#o = e, this.#s = [
      new g(t),
      new A(t),
      new p(t)
    ];
  }
  addSystem(t, e) {
    return this.#e.push(t), this.#t.push(e), this.#a(t), this;
  }
  addStartupSystem(t) {
    return this.#i.push(t), this.#a(t), this;
  }
  async build() {
    for (const a of this.#s)
      a.onBuildMainWorld?.(this.#s.filter((d) => d !== a));
    const t = this.#e.map((a) => this.#h(a)), e = this.#i.map((a) => this.#h(a)), i = ut(this.#e, this.#s), n = ct(this.#e, this.#t, i), r = q.from(i, n), o = O(this.#s);
    if (this.#r.threads > 1)
      for (let a = 1; a < this.#r.threads; a++) {
        const d = new c(this.#o, o);
        for (const M of this.#s)
          M.sendToThread && this.#n.push(d.send(M.sendToThread()));
        d.send(r), this.#n.push(d);
      }
    await Promise.all(this.#n.map((a) => a.receive()));
    for (const { execute: a, args: d } of e)
      a(...d);
    const h = /* @__PURE__ */ new Set();
    for (let a = 0; a < this.#e.length; a++)
      J(this.#e[a], this.#s) && h.add(a);
    return new R(t, this.#s.find((a) => a instanceof p).entityManager, this.#n, r, h);
  }
  #a(t) {
    for (const e of t.parameters)
      for (const i of this.#s)
        if (i.type === e.type) {
          i.onAddSystem?.(e);
          break;
        }
  }
  #h({ fn: t, parameters: e }) {
    return {
      execute: t,
      args: e.map((i) => {
        const n = this.#s.find((r) => r.type === i.type);
        if (!n)
          throw new Error("Unrecognized parameter.");
        return n.onBuildSystem(i);
      })
    };
  }
}
class pt {
  #t = [];
  #e = [];
  #i;
  #s;
  constructor(t) {
    j(t, void 0), this.#s = t, this.#i = [
      new g(t),
      new A(t),
      new p(t)
    ];
  }
  addSystem(t) {
    return this.#t.push(t), this.#n(t), this;
  }
  addStartupSystem(t) {
    return this.#e.push(t), this.#n(t), this;
  }
  async build() {
    for (const n of this.#i)
      n.onBuildMainWorld?.(this.#i.filter((r) => r !== n));
    const t = this.#t.map((n) => this.#r(n)), e = this.#e.map((n) => this.#r(n)), i = new V(Array.from({ length: t.length }, (n, r) => r));
    for (const { execute: n, args: r } of e)
      n(...r);
    return new R(t, this.#i.find((n) => n instanceof p).entityManager, [], i, /* @__PURE__ */ new Set());
  }
  #n(t) {
    for (const e of t.parameters)
      for (const i of this.#i)
        if (i.type === e.type) {
          i.onAddSystem?.(e);
          break;
        }
  }
  #r({ fn: t, parameters: e }) {
    return {
      execute: t,
      args: e.map((i) => {
        const n = this.#i.find((r) => r.type === i.type);
        if (!n)
          throw new Error("Unrecognized parameter.");
        return n.onBuildSystem(i);
      })
    };
  }
}
class mt {
  #t = [];
  #e;
  #i;
  constructor(t) {
    this.#i = t, this.#e = [
      new g(t),
      new A(t),
      new p(t)
    ];
  }
  addSystem(t) {
    return this.#t.push(t), this.#s(t), this;
  }
  addStartupSystem(t) {
    return this.#s(t), this;
  }
  async build() {
    c.globalSendableTypes = O(this.#e);
    for (const n of this.#e)
      n.receiveOnThread && n.receiveOnThread(await c.receive());
    const t = await c.receive(), e = this.#t.map((n) => this.#n(n)), i = new R(e, {}, [], t, /* @__PURE__ */ new Set());
    return c.send(0), i;
  }
  #s(t) {
    for (const e of t.parameters)
      for (const i of this.#e)
        if (i.type === e.type) {
          i.onAddSystem?.(e);
          break;
        }
  }
  #n({ fn: t, parameters: e }) {
    return {
      execute: t,
      args: e.map((i) => {
        const n = this.#e.find((r) => r.type === i.type);
        if (!n)
          throw new Error("Unrecognized parameter.");
        return n.onBuildSystem(i);
      })
    };
  }
}
const D = !!globalThis.document;
class R {
  static new(t = {}, e) {
    const i = t.threads && t.threads > 1 ? D ? lt : mt : pt;
    return new i({ ...ft, ...t }, e);
  }
  #t = /* @__PURE__ */ new Set();
  #e;
  #i;
  #s;
  #n;
  #r;
  constructor(t, e, i, n, r) {
    this.#e = t, this.#i = e, this.#s = i, this.#n = n, this.#r = r, D && this.#i.updateQueries(), this.#n.whenReady(() => this.#o());
  }
  async update() {
    for (let t = 0; t < this.#e.length; t++)
      this.#r.has(t) ? this.#t.add(t) : this.#n.add(t);
    this.#n.start(), await this.#n.allSystemsDone(), this.#n.reset();
  }
  async #o() {
    for await (const t of this.#n.iter(this.#t)) {
      const e = this.#e[t];
      e.execute(...e.args);
    }
    this.#n.whenReady(() => this.#o());
  }
}
export {
  y as Component,
  I as Mut,
  yt as P,
  c as Thread,
  nt as Type,
  R as default,
  gt as defineSystem
};
