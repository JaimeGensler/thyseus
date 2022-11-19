class F {
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
function j(i, t) {
  return Q(i, t);
}
const Q = (i, t) => t.reduce(
  (e, s) => e | 1n << BigInt(i.indexOf(s)),
  0n
);
function S(i) {
  return [i, 1];
}
S.isMut = function(i) {
  return Array.isArray(i) && i.length === 2 && typeof i[0] == "function" && i[1] === 1;
};
class k {
  #t;
  #e = [];
  #s;
  #i;
  constructor(t, e, s) {
    this.#i = e, this.#s = t, this.#t = this.#i.map(
      (n) => new n({}, 0, s)
    );
  }
  *[Symbol.iterator]() {
    for (const t of this.#e)
      for (let e = 0; e < t.size; e++) {
        for (const s of this.#t) {
          const n = t.columns.get(
            Object.getPrototypeOf(s).constructor
          );
          s.__$$s = n, s.__$$i = e;
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
class L {
  components = [];
  writes = [];
  constructor(t) {
    for (const e of t) {
      const s = S.isMut(e);
      this.components.push(s ? e[0] : e), this.writes.push(s);
    }
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof L ? this.components.some(
      (e, s) => t.components.some(
        (n, r) => e === n && (this.writes[s] || t.writes[r])
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e));
  }
  intoArgument(t) {
    const e = new k(
      j(t.components, this.components),
      this.components,
      t.commands
    );
    return t.queries.push(e), e;
  }
}
let R = 0, w = 1, z = 0, l = [], _ = [], $ = {};
const m = {
  u8: 1 << 0,
  u16: 1 << 1,
  u32: 1 << 2,
  u64: 1 << 3,
  i8: 1 << 4,
  i16: 1 << 5,
  i32: 1 << 6,
  i64: 1 << 7,
  f32: 1 << 8,
  f64: 1 << 9
}, M = {
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
}, V = (i, t, e) => {
  const s = _.reduce(
    (r, o, a) => o < t && a < r ? a : r,
    _.length
  );
  if (s === _.length) {
    l.push(i), _.push(t), $[i] = l.length === 0 ? 0 : z;
    return;
  }
  const n = l[s];
  l.splice(s, 0, i), _.splice(s, 0, t), $[i] = $[n];
  for (let r = s + 1; r < l.length; r++)
    $[l[r]] += e;
};
function A(i, t, e, s = 0) {
  return w = Math.max(w, t), R |= s, V(i, t, e), z += e, $;
}
function X() {
  const i = {
    schema: R,
    size: Math.ceil(z / w) * w,
    alignment: w
  };
  R = 0, z = 0, w = 1;
  for (let t = 0; t < l.length; t++)
    $[l[t]] /= _[t];
  return $ = {}, l.length = 0, _.length = 0, i;
}
function f(i) {
  return function() {
    return function(e, s) {
      const n = M[i], r = A(
        s,
        n.BYTES_PER_ELEMENT,
        n.BYTES_PER_ELEMENT,
        m[i]
      ), o = 31 - Math.clz32(n.BYTES_PER_ELEMENT);
      Object.defineProperty(e, s, {
        enumerable: !0,
        get() {
          return this.__$$s[i][(this.__$$b >> o) + r[s]];
        },
        set(a) {
          this.__$$s[i][(this.__$$b >> o) + r[s]] = a;
        }
      });
    };
  };
}
const H = f("u8"), J = f("u16"), Z = f("u32"), G = f("u64"), K = f("i8"), tt = f("i16"), et = f("i32"), st = f("i64"), it = f("f32"), nt = f("f64"), rt = function() {
  return function(t, e) {
    const s = A(
      e,
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
      m.u8
    );
    Object.defineProperty(t, e, {
      enumerable: !0,
      get() {
        return !!this.__$$s.u8[this.__$$b + s[e]];
      },
      set(n) {
        this.__$$s.u8[this.__$$b + s[e]] = Number(n);
      }
    });
  };
}, ot = new TextEncoder(), at = new TextDecoder();
function ht({
  characterCount: i,
  byteLength: t
}) {
  return function(s, n) {
    t ??= i * 3;
    const r = A(
      n,
      Uint8Array.BYTES_PER_ELEMENT,
      t
    );
    Object.defineProperty(s, n, {
      enumerable: !0,
      get() {
        return at.decode(
          this.__$$s.u8.subarray(
            this.__$$b + r[n],
            this.__$$b + r[n] + t
          )
        ).split("\0")[0];
      },
      set(o) {
        ot.encodeInto(
          o,
          this.__$$s.u8.subarray(
            this.__$$b + r[n],
            this.__$$b + r[n] + t
          ).fill(0)
        );
      }
    });
  };
}
function ct({ type: i, length: t }) {
  return function(s, n) {
    const r = M[i], o = A(
      n,
      r.BYTES_PER_ELEMENT,
      r.BYTES_PER_ELEMENT * t,
      m[i]
    ), a = 31 - Math.clz32(r.BYTES_PER_ELEMENT);
    Object.defineProperty(s, n, {
      enumerable: !0,
      get() {
        return this.__$$s[i].subarray(
          (this.__$$b >> a) + o[n],
          (this.__$$b >> a) + o[n] + t
        );
      },
      set(h) {
        this.__$$s[i].set(
          h.subarray(0, t),
          (this.__$$b >> a) + o[n]
        );
      }
    });
  };
}
function ut(i) {
  return function(e, s) {
    const n = A(
      s,
      i.alignment,
      i.size,
      i.schema
    );
    Object.defineProperty(e, s, {
      enumerable: !0,
      get() {
        const r = new i(this.__$$s, 0, {});
        return r.__$$b = this.__$$b + n[s] * i.alignment, r;
      },
      set(r) {
        this.__$$s.u8.set(
          r.__$$s,
          this.__$$b + n[s] * i.alignment
        );
      }
    });
  };
}
function c() {
  return function(t) {
    const { schema: e, size: s, alignment: n } = X();
    return class extends t {
      static schema = e | (t.schema ?? 0);
      static size = s;
      static alignment = n;
      __$$s;
      __$$b;
      #t;
      get __$$i() {
        return this.#t;
      }
      set __$$i(r) {
        this.#t = r, this.__$$b = r * this.constructor.size;
      }
      constructor(r, o) {
        super(), this.__$$s = r, this.#t = o, this.__$$b = o * this.constructor.size;
      }
    };
  };
}
c.bool = rt;
c.u8 = H;
c.u16 = J;
c.u32 = Z;
c.u64 = G;
c.i8 = K;
c.i16 = tt;
c.i32 = et;
c.i64 = st;
c.f32 = it;
c.f64 = nt;
c.string = ht;
c.array = ct;
c.substruct = ut;
function W(i) {
  return typeof i == "function" && typeof i.size == "number" && typeof i.alignment == "number" && typeof i.schema == "number";
}
class O {
  resource;
  canWrite;
  constructor(t) {
    const e = S.isMut(t);
    this.resource = e ? t[0] : t, this.canWrite = e;
  }
  isLocalToThread() {
    return !W(this.resource);
  }
  intersectsWith(t) {
    return t instanceof O ? this.resource === t.resource && (this.canWrite || t.canWrite) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class ft {
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
function T(i) {
  return (...t) => new i(...t);
}
const lt = {
  Commands: T(F),
  Query: T(L),
  Res: T(O),
  World: T(ft),
  Mut: S
};
function mt(i, t) {
  return {
    parameters: i(lt),
    fn: t
  };
}
function g(i, t, e = Error) {
  if (!i)
    throw new e(t);
}
function* B(i) {
  let t = 0;
  for (; i !== 0n; )
    (i & 1n) === 1n && (yield t), i >>= 1n, t++;
}
function dt(i, t, e) {
  const s = Array.from({ length: i.length }, () => 0n), n = (r, o) => (s[r] & 1n << BigInt(o)) !== 0n;
  return t.forEach((r, o) => {
    if (!!r) {
      for (const a of r.before ?? []) {
        const h = i.indexOf(a);
        h !== -1 && (g(
          !n(o, h),
          `Circular dependency detected: ${i[o].fn.name} (${o}) and ${i[h].fn.name} (${h}) depend on each other.`
        ), s[h] |= 1n << BigInt(o));
      }
      for (const a of r.after ?? []) {
        const h = i.indexOf(a);
        h !== -1 && (g(
          !n(h, o),
          `Circular dependency detected: ${i[o].fn.name} (${o}) and ${i[h].fn.name} (${h}) depend on each other.`
        ), s[o] |= 1n << BigInt(h));
      }
    }
  }), s.forEach((r, o) => {
    g(
      !n(o, o),
      `Circular dependency detected: ${i[o].fn.name} (${o}) and ${i[o].fn.name} (${o}) depend on each other.`
    );
  }), t.forEach((r, o) => {
    if (!!r) {
      if (r.beforeAll)
        for (const a of B(e[o]))
          a !== o && (s[o] & 1n << BigInt(a)) === 0n && (s[a] |= 1n << BigInt(o));
      if (r.afterAll)
        for (const a of B(e[o]))
          a !== o && (s[a] & 1n << BigInt(o)) === 0n && (s[o] |= 1n << BigInt(a));
    }
  }), s.forEach((r, o) => s[o] &= e[o]), s;
}
function gt(i, t) {
  return i.parameters.some(
    (e) => t.parameters.some(
      (s) => e.intersectsWith(s) || s.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function _t(i) {
  return i.map(
    (t) => i.reduce(
      (e, s, n) => e | BigInt(gt(t, s)) << BigInt(n),
      0n
    )
  );
}
const $t = (i, t) => {
  for (const [e, s] of t) {
    const n = i.get(e);
    n === void 0 ? i.set(e, s) : n !== 0n && i.set(e, n | s);
  }
  return i;
}, bt = mt(
  ({ World: i }) => [i()],
  async function(t) {
    const e = (await t.threads.send(
      "thyseus::getCommandQueue"
    )).reduce($t, t.commands.queue);
    for (const [s, n] of e)
      t.moveEntity(s, n);
    e.clear();
  }
);
function pt(i, t) {
  const e = [...t];
  return [...i].reduce(
    (s, n, r) => s.set(n, e[r]),
    /* @__PURE__ */ new Map()
  );
}
class d {
  static schema = m.u64 | m.u32;
  static size = 8;
  __$$s;
  __$$b;
  #t;
  commands;
  constructor(t, e, s) {
    this.__$$s = t, this.#t = e, this.__$$b = e * d.size, this.commands = s;
  }
  get __$$i() {
    return this.#t;
  }
  set __$$i(t) {
    this.#t = t, this.__$$b = t * d.size;
  }
  get id() {
    return this.__$$s.u64[this.__$$b >> 3];
  }
  get index() {
    return this.__$$s.u32[this.__$$b >> 2];
  }
  get generation() {
    return this.__$$s.u32[(this.__$$b >> 2) + 1];
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
const wt = Object.entries(M);
function N(i, t, e = i.config.getNewTableSize(0)) {
  const s = i.createBuffer(t.size * e);
  return wt.reduce(
    (n, [r, o]) => ((m[r] & t.schema) === m[r] && (n[r] = new o(s)), n),
    { buffer: s, u8: new Uint8Array(s) }
  );
}
const yt = Object.entries(M);
function Et(i, t, e) {
  const s = new i.buffer.constructor(
    t.size * e
  ), n = new Uint8Array(s);
  return n.set(i.u8), yt.reduce(
    (r, [o, a]) => ((m[o] & t.schema) === m[o] && (r[o] = new a(s)), r),
    { buffer: s, u8: n }
  );
}
class x {
  columns;
  meta;
  static create(t, e) {
    const s = new Uint32Array(t.createBuffer(8));
    return s[1] = t.config.getNewTableSize(0), new this(
      e.reduce((n, r) => (r.size > 0 && n.set(r, N(t, r)), n), /* @__PURE__ */ new Map()),
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
    this.columns.get(d).u64[this.size++] = t;
  }
  delete(t) {
    this.size--;
    for (const [e, s] of this.columns)
      s.u8.copyWithin(
        t * e.size,
        this.size * e.size,
        this.size * e.size + e.size
      ), s.u8.fill(
        0,
        this.size * e.size,
        this.size * e.size + e.size
      );
  }
  move(t, e) {
    for (const [s, n] of this.columns)
      e.columns.has(s) && e.columns.get(s).u8.set(
        n.u8.slice(
          t * s.size,
          t * s.size + s.size
        ),
        e.size * s.size
      );
    this.delete(t), e.size++;
  }
  grow(t) {
    this.capacity = t.config.getNewTableSize(this.capacity);
    for (const [e, s] of this.columns)
      this.columns.set(e, Et(s, e, this.capacity));
  }
}
function At(i) {
  i.addSystem(bt, { afterAll: !0 }), i.registerComponent(d), i.registerThreadChannel("thyseus::getCommandQueue", (t) => () => {
    const e = new Map(t.commands.queue);
    return t.commands.queue.clear(), e;
  }), i.registerThreadChannel(
    "thyseus::newTable",
    (t) => ([e, s, n]) => {
      const r = pt(
        [...B(e)].map((a) => t.components[a]),
        s
      ), o = new x(r, n);
      t.archetypes.set(e, o);
      for (const a of t.queries)
        a.testAdd(e, o);
    }
  ), i.registerThreadChannel(
    "thyseus::growTable",
    (t) => ([e, s]) => {
      const n = t.archetypes.get(e);
      let r = 0;
      for (const o of n.columns.keys())
        n.columns.set(o, s[r++]);
    }
  );
}
class E {
  static isMainThread = !!globalThis.document;
  isMainThread = E.isMainThread;
  static spawn(t, e) {
    return new this(
      E.isMainThread ? Array.from(
        { length: t },
        () => new Worker(e, { type: "module" })
      ) : [globalThis]
    );
  }
  #t = 0;
  #e = /* @__PURE__ */ new Map();
  #s = {};
  #i = [];
  #n;
  constructor(t) {
    this.#n = t;
    const e = ({
      currentTarget: s,
      data: [n, r, o]
    }) => {
      this.#e.has(n) ? (this.#e.get(n)(o), this.#e.delete(n)) : r in this.#s ? s.postMessage([
        n,
        r,
        this.#s[r](o)
      ]) : s.postMessage([n, r, null]);
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
        const n = this.#t++;
        return s.postMessage([n, t, e]), new Promise((r) => this.#e.set(n, r));
      })
    );
  }
  queue(t) {
    if (E.isMainThread) {
      const e = t();
      return this.#i.push(e), e;
    } else
      return this.#i.shift();
  }
  async wrapInQueue(t) {
    const e = "@@";
    let s;
    return this.isMainThread ? (s = await t(), await this.send(e, this.#i)) : (s = await new Promise(
      (n) => this.setListener(e, (r) => {
        this.#i = r, n(t());
      })
    ), this.deleteListener(e)), this.#i.length = 0, s;
  }
}
class Tt {
  systems = [];
  systemDependencies = [];
  #t = [];
  components = /* @__PURE__ */ new Set();
  resources = /* @__PURE__ */ new Set();
  threadChannels = {};
  config;
  url;
  constructor(t, e) {
    this.config = t, this.url = e, At(this);
  }
  addSystem(t, e) {
    return this.systems.push(t), this.systemDependencies.push(e), this.#e(t), this;
  }
  addStartupSystem(t) {
    return this.#t.push(t), this.#e(t), this;
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
    const t = E.spawn(this.config.threads - 1, this.url), e = await t.wrapInQueue(
      () => new Ot(
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
      for (const { fn: s, parameters: n } of this.#t)
        await s(...n.map((r) => r.intoArgument(e)));
    }
    return await t.wrapInQueue(() => {
    }), e;
  }
  #e(t) {
    t.parameters.forEach((e) => e.onAddSystem(this));
  }
}
const C = 0b11111111n;
class P {
  static getBufferLength(t, e) {
    return Math.ceil(t / 8) * e;
  }
  #t;
  width;
  length;
  #e;
  constructor(t, e, s) {
    this.width = t, this.length = e, this.#e = s, this.#t = Math.ceil(this.width / 8);
  }
  get bytesPerElement() {
    return this.#t;
  }
  get byteLength() {
    return this.#e.byteLength;
  }
  get(t) {
    let e = 0n;
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      e |= BigInt(this.#e[s + n]) << BigInt(n * 8);
    return e;
  }
  set(t, e) {
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[s + n] = Number(e >> BigInt(n * 8) & C);
  }
  OR(t, e) {
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[s + n] |= Number(e >> BigInt(n * 8) & C);
  }
  XOR(t, e) {
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[s + n] ^= Number(e >> BigInt(n * 8) & C);
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
let zt = 0;
class Bt {
  static fromWorld(t, e, s) {
    const n = t.threads.queue(
      () => _t(e)
    ), r = t.threads.queue(
      () => dt(e, s, n)
    ), o = t.threads.isMainThread ? e.reduce(
      (b, q, Y) => q.parameters.some(
        (v) => v.isLocalToThread()
      ) ? b.add(Y) : b,
      /* @__PURE__ */ new Set()
    ) : /* @__PURE__ */ new Set(), a = t.threads.queue(
      () => new Uint16Array(t.createBuffer(2 * e.length + 2))
    ), h = new P(
      e.length,
      2,
      t.threads.queue(
        () => new Uint8Array(
          t.createBuffer(
            P.getBufferLength(e.length, 2)
          )
        )
      )
    ), u = t.threads.queue(() => String(zt++));
    return new this(
      n,
      r,
      a,
      h,
      o,
      u
    );
  }
  #t = new BroadcastChannel("thyseus::executor");
  #e = [];
  #s;
  #i;
  #n;
  #r;
  #o;
  #a;
  constructor(t, e, s, n, r, o) {
    this.#s = t, this.#i = e, this.#n = s, this.#r = n, this.#o = r, this.#a = o, this.#t.addEventListener("message", () => {
      this.#e.forEach((a) => a(0)), this.#e.length = 0;
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
    this.#t.postMessage(0), this.#e.forEach((t) => t(0)), this.#e.length = 0;
  }
  async #c() {
    return new Promise((t) => this.#e.push(t));
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
        const n = this.#r.get(0), r = this.#r.get(1);
        for (const o of [
          ...t,
          ...p.iter(this.#n)
        ])
          if ((n & this.#s[o]) === 0n && (r & this.#i[o]) === this.#i[o]) {
            s = o, t.has(o) ? t.delete(o) : p.delete(
              this.#n,
              this.#n.indexOf(o)
            ), this.#r.OR(0, 1n << BigInt(o));
            break;
          }
      }), s > -1 ? (yield s, await navigator.locks.request(this.#a, () => {
        this.#r.XOR(0, 1n << BigInt(s)), this.#r.OR(1, 1n << BigInt(s));
      }), this.#h()) : (e !== 0 || t.size !== 0) && await this.#c();
    }
  }
}
class St {
  queue = /* @__PURE__ */ new Map();
  #t;
  #e;
  #s;
  #i;
  constructor(t, e) {
    this.#t = t;
    const s = new ArrayBuffer(8);
    this.#s = new BigUint64Array(1), this.#e = new d(
      { buffer: s, u8: new Uint8Array(s), u64: this.#s },
      0,
      this
    ), this.#i = e;
  }
  spawn() {
    const t = this.#t.spawn();
    return this.#s[0] = t, this.insertInto(t, d), this.#e;
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
      (this.queue.get(t) ?? this.#t.getTableId(t)) | 1n << BigInt(this.#i.indexOf(e))
    );
  }
  removeFrom(t, e) {
    this.queue.set(
      t,
      (this.queue.get(t) ?? this.#t.getTableId(t)) ^ 1n << BigInt(this.#i.indexOf(e))
    );
  }
}
const Mt = 0, I = 1, D = 32n, qt = 0x00000000ffffffffn, y = (i) => Number(i & qt), Ct = (i) => Number(i >> D);
class U {
  static fromWorld(t) {
    const e = t.config.maxEntities;
    return new U(
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(e * 4))
      ),
      new P(
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
  #t;
  #e;
  constructor(t, e, s, n, r) {
    this.generations = t, this.tableIds = e, this.row = s, this.#t = n, this.#e = r;
  }
  spawn() {
    for (let e = 0; e < this.#e.length && Atomics.load(this.#t, I) !== 0; e++)
      for (; ; ) {
        const s = Atomics.load(this.#e, e);
        if (s === 0)
          break;
        const n = It(s);
        if (Atomics.xor(this.#e, e, 1 << n) === s)
          return Atomics.sub(this.#t, I, 1), BigInt(this.generations[n]) << D | BigInt(32 * e + n);
      }
    const t = Atomics.add(this.#t, Mt, 1);
    return BigInt(t);
  }
  despawn(t) {
    const e = y(t), s = Ct(t);
    Atomics.compareExchange(
      this.generations,
      e,
      s,
      s + 1
    ) === s && (Atomics.or(this.#e, e >> 5, 1 << (e & 31)), Atomics.add(this.#t, I, 1));
  }
  getTableId(t) {
    return this.tableIds.get(y(t));
  }
  getRow(t) {
    return this.row[y(t)];
  }
  setLocation(t, e, s) {
    this.tableIds.set(y(t), e), this.row[y(t)] = s;
  }
}
const It = (i) => (i >>>= 0, 31 - Math.clz32(i & -i)), Rt = (i = {}) => ({
  threads: 1,
  maxEntities: 2 ** 16,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...i
}), Pt = ({ threads: i, maxEntities: t }, e) => {
  i > 1 && (g(
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
    Number.isInteger(i) && 0 < i && i < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  ), g(
    Number.isInteger(t) && 0 < t && t < 2 ** 32,
    "Invalid config - 'maxEntities' must be an integer such that 0 < maxEntities < 2**32",
    RangeError
  );
};
function Lt(i, t) {
  const e = Rt(i);
  return Pt(e, t), e;
}
class Ot {
  static new(t, e) {
    return new Tt(Lt(t, e), e);
  }
  archetypes = /* @__PURE__ */ new Map();
  queries = [];
  #t;
  config;
  resources;
  threads;
  systems;
  #e;
  commands;
  entities;
  components;
  constructor(t, e, s, n, r, o, a) {
    this.#t = t.threads > 1 ? SharedArrayBuffer : ArrayBuffer, this.config = t, this.threads = e;
    for (const u in a)
      this.threads.setListener(u, a[u](this));
    this.components = s, this.entities = U.fromWorld(this), this.commands = new St(this.entities, this.components), this.#e = Bt.fromWorld(this, r, o), this.resources = /* @__PURE__ */ new Map();
    for (const u of n)
      if (W(u)) {
        const b = e.queue(
          () => N(this, u, 1)
        );
        this.resources.set(
          u,
          new u(b, 0, this.commands)
        );
      } else
        e.isMainThread && this.resources.set(u, new u());
    const h = ({ fn: u, parameters: b }) => ({
      execute: u,
      args: b.map((q) => q.intoArgument(this))
    });
    this.systems = r.map(h), this.#e.onReady(() => this.#s());
  }
  moveEntity(t, e) {
    const s = this.entities.getTableId(t), n = this.archetypes.get(s);
    if (e === 0n) {
      this.#i(t);
      return;
    }
    const r = this.#n(e);
    r.isFull && this.#r(e, r), n ? (this.entities.setLocation(
      n.columns.get(d).u64[n.size - 1],
      s,
      this.entities.getRow(t)
    ), n.move(this.entities.getRow(t), r)) : r.add(t), this.entities.setLocation(
      t,
      e,
      r.size - 1
    );
  }
  createBuffer(t) {
    return new this.#t(t);
  }
  async update() {
    this.#e.reset(), this.#e.start();
  }
  async #s() {
    for await (const t of this.#e) {
      const e = this.systems[t];
      await e.execute(...e.args);
    }
    this.#e.onReady(() => this.#s());
  }
  #i(t) {
    const e = this.entities.getTableId(t), s = this.archetypes.get(e);
    if (s) {
      const n = this.entities.getRow(t);
      this.entities.setLocation(
        s.columns.get(d).u64[s.size - 1],
        e,
        n
      ), s.delete(this.entities.getRow(t));
    }
    this.entities.setLocation(t, 0n, 0);
  }
  #n(t) {
    if (!this.archetypes.has(t)) {
      const e = x.create(
        this,
        [...B(t)].map((s) => this.components[s])
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
function Ut(i) {
  return i;
}
export {
  d as Entity,
  Ot as World,
  bt as applyCommands,
  Ut as definePlugin,
  mt as defineSystem,
  c as struct
};
