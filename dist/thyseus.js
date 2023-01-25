import { DEV as P } from "esm-env";
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
const b = {
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
}, D = {
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
}, [, ...ht] = Object.entries(D);
function Z(n, t) {
  return ht.reduce((e, [i, s]) => ((b[i] & n.schema) === b[i] && (e[i] = new s(e.buffer)), e), t);
}
function O(n, t, e) {
  const i = new n(t.size * e);
  return Z(t, {
    buffer: i,
    u8: new Uint8Array(i)
  });
}
function at(n, t, e) {
  const i = new n.buffer.constructor(
    t.size * e
  ), s = new Uint8Array(i);
  return s.set(n.u8), n.buffer = i, n.u8 = s, Z(t, n);
}
function G(n) {
  n.__$$s ??= O(ArrayBuffer, n.constructor, 1), n.__$$b ??= 0;
}
class f {
  static schema = b.u64 | b.u32;
  static size = 8;
  #t;
  constructor(t, e) {
    G(this), this.#t = t, e !== void 0 && (this.__$$s.u64[0] = e);
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
  add(t) {
    return this.#t.insertInto(this.id, t), this;
  }
  addType(t) {
    return this.#t.insertTypeInto(this.id, t), this;
  }
  remove(t) {
    return this.#t.removeFrom(this.id, t), this;
  }
  despawn() {
    this.#t.despawn(this.id);
  }
}
class I {
  static create(t, e, i, s) {
    const r = t.config.getNewTableSize(0);
    return new this(
      t,
      e.reduce((h, o) => (o.size > 0 && h.set(
        o,
        O(t.buffer, o, r)
      ), h), /* @__PURE__ */ new Map()),
      r,
      i,
      s
    );
  }
  #t;
  columns;
  capacity;
  bitfield;
  #e;
  constructor(t, e, i, s, r) {
    this.#t = t, this.columns = e, this.capacity = i, this.bitfield = s, this.#e = r;
  }
  get id() {
    return this.#e;
  }
  get size() {
    return this.#t.tableLengths[this.#e];
  }
  set size(t) {
    this.#t.tableLengths[this.#e] = t;
  }
  get isFull() {
    return this.capacity === this.size;
  }
  delete(t) {
    this.size--;
    for (const [e, i] of this.columns)
      i.u8.copyWithin(
        t * e.size,
        this.size * e.size,
        this.size * e.size + e.size
      ), i.u8.fill(
        0,
        this.size * e.size,
        this.size * e.size + e.size
      );
  }
  move(t, e) {
    const i = this.columns.get(f).u64[this.size - 1];
    for (const [s, r] of this.columns)
      e.columns.has(s) && e.columns.get(s).u8.set(
        r.u8.slice(
          t * s.size,
          t * s.size + s.size
        ),
        e.size * s.size
      );
    return e.size++, this.delete(t), i;
  }
  grow(t) {
    this.capacity = t.config.getNewTableSize(this.capacity);
    for (const [e, i] of this.columns)
      this.columns.set(e, at(i, e, this.capacity));
  }
  incrementGeneration(t) {
    this.columns.get(f).u32[(t << 1) + 1]++;
  }
}
function* w(n) {
  let t = 0;
  for (; n !== 0n; )
    (n & 1n) === 1n && (yield t), n >>= 1n, t++;
}
let ut = 1;
function z(n, t) {
  function e(...i) {
    return [n, ut++, i];
  }
  return e.channelName = n, e.onReceive = t, e;
}
const ct = [];
class S {
  static isMainThread = !!globalThis.document;
  isMainThread = S.isMainThread;
  static spawn(t, e) {
    return new this(
      S.isMainThread ? Array.from(
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
      currentTarget: i,
      data: [s, r, h]
    }) => {
      if (this.#t.has(r)) {
        const o = this.#e.get(r);
        o.push(h), o.length === this.#n.length && (this.#t.get(r)(o), this.#t.delete(r), this.#e.delete(r));
      } else
        s in this.#s ? i.postMessage([
          s,
          r,
          this.#s[s](...h)
        ]) : i.postMessage([s, r, null]);
    };
    for (const i of this.#n)
      i.addEventListener("message", e);
  }
  setListener(t, e) {
    this.#s[t] = e;
  }
  deleteListener(t) {
    delete this.#s[t];
  }
  send(t) {
    return this.#n.length === 0 ? Promise.resolve(ct) : new Promise((e) => {
      for (const i of this.#n)
        i.postMessage(t);
      this.#e.set(t[1], []), this.#t.set(t[1], e);
    });
  }
  queue(t) {
    if (S.isMainThread) {
      const e = t();
      return this.#i.push(e), e;
    }
    return this.#i.shift();
  }
  async wrapInQueue(t) {
    const e = "threadGroup::queue";
    let i;
    return this.isMainThread ? (i = await t(), await this.send([e, 0, [this.#i]])) : (i = await new Promise(
      (s) => this.setListener(e, (r) => {
        this.#i = r, s(t());
      })
    ), this.deleteListener(e)), this.#i.length = 0, i;
  }
}
const H = z(
  "thyseus::getCommandQueue",
  (n) => () => n.commands.getData()
), ft = z(
  "thyseus::clearCommandQueue",
  (n) => () => {
    n.commands.reset();
  }
), J = z(
  "thyseus::sendTable",
  (n) => (t, e, i, s) => {
    const r = [...w(s)].reduce((o, a, c) => (n.components[a].size > 0 && o.set(n.components[a], t.shift()), o), /* @__PURE__ */ new Map()), h = new I(n, r, e, s, i);
    n.archetypes[i] = h;
    for (const o of n.queries)
      o.testAdd(s, h);
  }
), X = z(
  "thyseus::resizeTable",
  (n) => (t, e, i) => {
    const s = n.archetypes[t];
    s.capacity = e;
    let r = 0;
    for (const h of s.columns.keys())
      s.columns.set(h, i[r++]);
  }
), K = z(
  "thyseus::resizeTableLengths",
  (n) => (t) => {
    n.tableLengths = t;
  }
), lt = z(
  "thyseus::resizeEntityLocations",
  (n) => (t) => {
    n.entities.setLocations(t);
  }
), dt = 0x00000000ffffffffn, B = (n) => Number(n & dt), R = 256;
class mt {
  static fromWorld(t) {
    const e = BigUint64Array.BYTES_PER_ELEMENT * R;
    return new this(
      t,
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(e))
      ),
      t.threads.queue(() => new Uint32Array(t.createBuffer(8))),
      t.archetypes[0]
    );
  }
  #t;
  #e;
  #s;
  #i;
  constructor(t, e, i, s) {
    this.#t = t, this.#e = e, this.#s = i, this.#i = s;
  }
  get isFull() {
    return this.#s[0] >= this.#e.length >> 1;
  }
  spawn() {
    const t = this.#i.size;
    for (let e = this.#n(); e < t; e = this.#n())
      if (this.#r(e))
        return this.#i.columns.get(f).u64[t - e - 1];
    return BigInt(Atomics.add(this.#s, 0, 1));
  }
  isAlive(t) {
    const e = this.getTableIndex(t), i = this.getRow(t);
    return e === 0 || this.#t.archetypes[e].columns.get(f).u64[i] === t;
  }
  #n() {
    return Atomics.load(this.#s, 1);
  }
  #r(t) {
    return t === Atomics.compareExchange(this.#s, 1, t, t + 1);
  }
  resetCursor() {
    this.#s[1] = 0;
  }
  grow(t) {
    const e = BigUint64Array.BYTES_PER_ELEMENT * Math.ceil((this.#s[0] + 1) / R) * R, i = new Uint32Array(t.createBuffer(e));
    i.set(this.#e), this.#e = i, t.threads.send(lt(this.#e));
  }
  setLocations(t) {
    this.#e = t;
  }
  getTableIndex(t) {
    return this.#e[B(t) << 1] ?? 0;
  }
  setTableIndex(t, e) {
    this.#e[B(t) << 1] = e;
  }
  getRow(t) {
    return this.#e[(B(t) << 1) + 1] ?? 0;
  }
  setRow(t, e) {
    this.#e[(B(t) << 1) + 1] = e;
  }
}
class gt extends I {
  constructor(t) {
    super(t, /* @__PURE__ */ new Map(), 0, 0n, 0);
  }
  get isFull() {
    return !1;
  }
  move(t, e) {
    const i = BigInt(t);
    return e.columns.get(f).u64[e.size] = i, e.size++, i;
  }
}
class pt {
  #t = [];
  #e = 0;
  #s;
  #i;
  #n;
  #r;
  #o;
  #h;
  constructor(t, e, i, s, r) {
    this.#i = t, this.#o = i, this.#n = e, this.#r = s, this.#h = r, this.#s = this.#r.map(
      (h) => h === f ? new h(this.#h) : new h()
    );
  }
  get size() {
    return this.#t.reduce((t, e) => t + e.size, 0);
  }
  *[Symbol.iterator]() {
    this.#e >= this.#s.length && this.#s.push(
      ...this.#r.map(
        (i) => i === f ? new i(this.#h) : new i()
      )
    );
    const t = this.#s.slice(
      this.#e,
      this.#e + this.#r.length
    ), e = this.#e;
    this.#e += this.#r.length;
    for (const i of this.#t) {
      t.forEach((s, r) => {
        const h = this.#s[r + e], o = i.columns.get(h.constructor);
        o ? (t[r] = h, t[r].__$$s = o) : t[r] = null;
      });
      for (let s = 0; s < i.size; s++) {
        for (const r of t)
          r && (r.__$$b = s * r.constructor.size);
        this.#o ? yield t[0] : yield t;
      }
    }
  }
  testAdd(t, e) {
    this.#u(t) && this.#t.push(e);
  }
  #u(t) {
    for (let e = 0; e < this.#i.length; e++)
      if ((this.#i[e] & t) === this.#i[e] && (this.#n[e] & t) === 0n)
        return !0;
    return !1;
  }
}
class L {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class A {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class W {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class N {
  #t;
  constructor(t) {
    this.#t = t;
  }
  get value() {
    return this.#t;
  }
}
class Y {
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
function _(n, t, e = Error) {
  if (!n)
    throw new e(t);
}
const U = (n, t, e = []) => (Array.isArray(t) ? t : [t]).reduce(
  (i, s, r) => e[r] ? i : i | 1n << BigInt(n.indexOf(s)),
  0n
);
function $(n, t, e) {
  let i = e;
  for (const s of Array.isArray(n) ? n : [n])
    i = t(i, s);
  return i;
}
function Et(n, t) {
  $(t, function e(i, s) {
    s instanceof W || s instanceof N ? (Array.isArray(s.value) ? s.value : [s.value]).forEach(
      (r) => n.registerComponent(r)
    ) : s instanceof Y && ($(s.l, e), $(s.r, e));
  });
}
function _t(n, t, e, i) {
  const s = $(
    i,
    function h(o, a) {
      if (a instanceof W) {
        const c = U(
          n,
          a.value
        );
        return {
          withs: o.withs.map((u) => u | c),
          withouts: o.withouts
        };
      } else if (a instanceof N) {
        const c = U(
          n,
          a.value
        );
        return {
          withs: o.withs,
          withouts: o.withouts.map((u) => u | c)
        };
      } else if (a instanceof Y) {
        const c = $(a.l, h, o), u = $(a.r, h, o);
        return {
          withs: [...c.withs, ...u.withs],
          withouts: [...c.withouts, ...u.withouts]
        };
      }
      throw new Error(
        `Unrecognized filter (${a.constructor.name}) in Query.`
      );
    },
    {
      withs: [
        U(n, t, e)
      ],
      withouts: [0n]
    }
  ), r = s.withs.reduce(
    (h, o, a) => (s.withs[a] & s.withouts[a]) === 0n ? h.add(a) : h,
    /* @__PURE__ */ new Set()
  );
  return s.withs = s.withs.filter((h, o) => r.has(o)), s.withouts = s.withouts.filter((h, o) => r.has(o)), P && _(
    s.withs.length > 0,
    "Tried to construct a query that cannot match any entities."
  ), s;
}
class F {
  components = [];
  writes = [];
  optionals = [];
  filters;
  isIndividual;
  constructor(t, e = []) {
    this.isIndividual = !Array.isArray(t);
    const i = Array.isArray(t) ? t : [t];
    for (const s of i) {
      const r = s instanceof A || s instanceof L && s.value instanceof A;
      this.writes.push(r), this.optionals.push(s instanceof L);
      const h = s instanceof A ? s.value : s instanceof L ? s.value instanceof A ? s.value.value : s.value : s;
      P && _(
        h.size > 0,
        "You may not request direct access to ZSTs - use a With filter instead."
      ), this.components.push(h);
    }
    this.filters = e;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof F ? this.components.some(
      (e, i) => t.components.some(
        (s, r) => e === s && (this.writes[i] || t.writes[r])
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e)), Et(t, this.filters);
  }
  intoArgument(t) {
    const { withs: e, withouts: i } = _t(
      t.components,
      this.components,
      this.optionals,
      this.filters
    ), s = new pt(e, i, this.isIndividual, this.components, t.commands);
    return t.queries.push(s), s;
  }
}
let q = 0, T = 1, x = 0, m = [], E = [], y = {};
const yt = (n, t, e) => {
  const i = E.reduce(
    (r, h, o) => h < t && o < r ? o : r,
    E.length
  );
  if (i === E.length) {
    m.push(n), E.push(t), y[n] = m.length === 0 ? 0 : x;
    return;
  }
  const s = m[i];
  m.splice(i, 0, n), E.splice(i, 0, t), y[n] = y[s];
  for (let r = i + 1; r < m.length; r++)
    y[m[r]] += e;
};
function v(n, t, e, i = 0) {
  return T = Math.max(T, t), q |= i, yt(n, t, e), x += e, y;
}
function wt() {
  const n = {
    schema: q,
    size: Math.ceil(x / T) * T,
    alignment: T
  };
  q = 0, x = 0, T = 1;
  for (let t = 0; t < m.length; t++)
    y[m[t]] /= E[t];
  return y = {}, m.length = 0, E.length = 0, n;
}
function d(n) {
  return function() {
    return function(e, i) {
      const s = D[n], r = v(
        i,
        s.BYTES_PER_ELEMENT,
        s.BYTES_PER_ELEMENT,
        b[n]
      ), h = 31 - Math.clz32(s.BYTES_PER_ELEMENT);
      Object.defineProperty(e, i, {
        enumerable: !0,
        get() {
          return this.__$$s[n][(this.__$$b >> h) + r[i]];
        },
        set(o) {
          this.__$$s[n][(this.__$$b >> h) + r[i]] = o;
        }
      });
    };
  };
}
const bt = d("u8"), At = d("u16"), Tt = d("u32"), $t = d("u64"), zt = d("i8"), St = d("i16"), vt = d("i32"), Bt = d("i64"), Mt = d("f32"), Lt = d("f64"), Ct = function() {
  return function(t, e) {
    const i = v(
      e,
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
      b.u8
    );
    Object.defineProperty(t, e, {
      enumerable: !0,
      get() {
        return !!this.__$$s.u8[this.__$$b + i[e]];
      },
      set(s) {
        this.__$$s.u8[this.__$$b + i[e]] = Number(s);
      }
    });
  };
}, It = new TextEncoder(), xt = new TextDecoder();
function Pt({
  characterCount: n,
  byteLength: t
}) {
  return function(i, s) {
    t ??= n * 3;
    const r = v(
      s,
      Uint8Array.BYTES_PER_ELEMENT,
      t
    );
    Object.defineProperty(i, s, {
      enumerable: !0,
      get() {
        return xt.decode(
          this.__$$s.u8.subarray(
            this.__$$b + r[s],
            this.__$$b + r[s] + t
          )
        ).split("\0")[0];
      },
      set(h) {
        It.encodeInto(
          h,
          this.__$$s.u8.subarray(
            this.__$$b + r[s],
            this.__$$b + r[s] + t
          ).fill(0)
        );
      }
    });
  };
}
function Rt({ type: n, length: t }) {
  return function(i, s) {
    const r = D[n], h = v(
      s,
      r.BYTES_PER_ELEMENT,
      r.BYTES_PER_ELEMENT * t,
      b[n]
    ), o = 31 - Math.clz32(r.BYTES_PER_ELEMENT);
    Object.defineProperty(i, s, {
      enumerable: !0,
      get() {
        return this.__$$s[n].subarray(
          (this.__$$b >> o) + h[s],
          (this.__$$b >> o) + h[s] + t
        );
      },
      set(a) {
        this.__$$s[n].set(
          a.subarray(0, t),
          (this.__$$b >> o) + h[s]
        );
      }
    });
  };
}
function Ut(n) {
  return function(e, i) {
    const s = v(
      i,
      n.alignment,
      n.size,
      n.schema
    );
    Object.defineProperty(e, i, {
      enumerable: !0,
      get() {
        const r = new n();
        return r.__$$s = this.__$$s, r.__$$b = this.__$$b + s[i] * n.alignment, r;
      },
      set(r) {
        this.__$$s.u8.set(
          r.__$$s,
          this.__$$b + s[i] * n.alignment
        );
      }
    });
  };
}
function l() {
  return function(t) {
    const { schema: e, size: i, alignment: s } = wt();
    return class extends t {
      static schema = e | (t.schema ?? 0);
      static size = i;
      static alignment = s;
      constructor(...r) {
        super(...r), G(this);
      }
    };
  };
}
l.bool = Ct;
l.u8 = bt;
l.u16 = At;
l.u32 = Tt;
l.u64 = $t;
l.i8 = zt;
l.i16 = St;
l.i32 = vt;
l.i64 = Bt;
l.f32 = Mt;
l.f64 = Lt;
l.string = Pt;
l.array = Rt;
l.substruct = Ut;
function tt(n) {
  return typeof n == "function" && typeof n.size == "number" && typeof n.alignment == "number" && typeof n.schema == "number";
}
class Q {
  resource;
  canWrite;
  constructor(t) {
    const e = t instanceof A;
    this.resource = e ? t.value : t, this.canWrite = e;
  }
  isLocalToThread() {
    return !tt(this.resource);
  }
  intersectsWith(t) {
    return t instanceof Q ? this.resource === t.resource && (this.canWrite || t.canWrite) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class qt {
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
function g(n) {
  return (...t) => new n(...t);
}
const Dt = {
  Commands: g(ot),
  Query: g(F),
  Res: g(Q),
  World: g(qt),
  Mut: g(A),
  Optional: g(L),
  With: g(W),
  Without: g(N),
  Or(n, t) {
    return new Y(n, t);
  }
};
class V {
  #t = 0;
  #e = [];
  #s;
  fn;
  constructor(t, e) {
    this.#s = t, this.fn = e;
  }
  get parameters() {
    return this.#s(Dt);
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
    return new V(this.#s, this.fn);
  }
  getAndClearDependencies() {
    const t = {
      dependencies: this.#e,
      implicitPosition: this.#t
    };
    return this.#e = [], this.#t = 0, t;
  }
}
function Ot(n, t) {
  return new V(n, t);
}
function C(n) {
  return Math.ceil(n / 8) * 8;
}
function* Wt(n, t) {
  for (const [, e, i] of n)
    for (let s = 0; s < e.byteLength; ) {
      const r = i.getBigUint64(s), h = i.getUint32(s + 8), o = t.components[h];
      s += 16;
      const a = e.subarray(s, s + o.size);
      yield [r, o, a], s += C(o.size);
    }
}
function Nt(n, [t]) {
  for (const [e, i] of t) {
    const s = n.get(e);
    s === void 0 ? n.set(e, i) : i === 0n ? n.set(e, 0n) : s !== 0n && n.set(e, s | i);
  }
  return n;
}
const et = Ot(
  ({ World: n }) => [n()],
  async function(t) {
    t.entities.isFull && t.entities.grow(t);
    const [e, i, s] = t.commands.getData(), r = await t.threads.send(H()), h = r.reduce(Nt, e);
    for (const [a, c] of h)
      t.moveEntity(a, c);
    r.push([e, i, s]);
    for (const [a, c, u] of Wt(
      r,
      t
    )) {
      const p = t.entities.getTableIndex(a);
      if (p === 0 || p === 1)
        continue;
      const nt = t.archetypes[p].columns.get(c), rt = t.entities.getRow(a);
      nt.u8.set(u, rt * c.size);
    }
    const o = t.threads.send(ft());
    return t.commands.reset(), t.entities.resetCursor(), o;
  }
);
function Yt(n) {
  n.registerComponent(f).addSystem(et.afterAll()).registerThreadChannel(H).registerThreadChannel(J).registerThreadChannel(X).registerThreadChannel(K);
}
function Ft(n, t) {
  return n.parameters.some(
    (e) => t.parameters.some(
      (i) => e.intersectsWith(i) || i.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function st(n) {
  return n.map(
    (t) => n.reduce(
      (e, i, s) => e | BigInt(Ft(t, i)) << BigInt(s),
      0n
    )
  );
}
function it(n, t, e) {
  const i = t.map(
    (r) => r.dependencies.reduce((h, o) => {
      const a = n.indexOf(o);
      return a === -1 ? h : h | 1n << BigInt(a);
    }, 0n)
  ), s = [...i];
  s.forEach(function r(h, o) {
    for (const a of w(h))
      r(s[a], a), s[o] |= s[a];
  }), P && s.forEach((r, h) => {
    _(
      (r & 1n << BigInt(h)) === 0n,
      `Circular Dependency Detected - Sytem #${h} (${n[h].fn.name}) depends on itself!`
    );
  });
  for (let r = 0; r < n.length; r++) {
    const h = t[r];
    if (h.implicitPosition === -1)
      for (const o of w(e[r]))
        o !== r && (s[r] & 1n << BigInt(o)) === 0n && (i[o] |= 1n << BigInt(r), s[o] |= 1n << BigInt(r));
    else if (h.implicitPosition === 1)
      for (const o of w(e[r]))
        o !== r && (s[o] & 1n << BigInt(r)) === 0n && (i[r] |= 1n << BigInt(o), s[r] |= 1n << BigInt(o));
  }
  return i.forEach((r, h) => i[h] &= e[h]), i;
}
function k(n, t, e) {
  for (const i of w(t))
    if (n[i] === e)
      return !1;
  return !0;
}
let Qt = 0;
const M = (...n) => {
};
class Vt {
  static fromWorld(t, e, i) {
    const s = t.threads.queue(
      () => st(e)
    ), r = t.threads.queue(
      () => it(e, i, s)
    ), h = t.threads.isMainThread ? e.map(() => !0) : e.map((c) => !c.parameters.some((u) => u.isLocalToThread())), o = t.threads.queue(
      () => t.createBuffer(8 + e.length * 3)
    ), a = t.threads.queue(
      () => `thyseus::ParallelExecutor${Qt++}`
    );
    return new this(
      t,
      new Uint32Array(o, 0, 2),
      new Uint8Array(o, 8, e.length),
      new Uint8Array(o, 8 + e.length, e.length),
      new Uint8Array(o, 8 + e.length * 2, e.length),
      s,
      r,
      h,
      a
    );
  }
  #t = M;
  #e = M;
  #s;
  #i;
  #n;
  #r;
  #o;
  #h;
  #u;
  #f;
  #a;
  #l;
  #c;
  #m;
  constructor(t, e, i, s, r, h, o, a, c) {
    this.#c = t.systems, this.#m = t.arguments, this.#l = t.threads.isMainThread, this.#h = h, this.#u = o, this.#o = a, this.#s = e, this.#i = i, this.#n = s, this.#r = r, this.#a = new BroadcastChannel(c), this.#f = c, this.#a.addEventListener(
      "message",
      ({ data: u }) => {
        u === 0 ? this.#g() : u === 1 ? (this.#t(), this.#t = M) : (this.#e(), this.#e = M);
      }
    );
  }
  async start() {
    return this.#d = this.#c.length, this.#s[1] = 0, this.#i.fill(1), this.#r.fill(0), this.#n.fill(0), this.#p(), this.#g();
  }
  get #d() {
    return this.#s[0];
  }
  set #d(t) {
    this.#s[0] = t;
  }
  async #g() {
    for (; this.#d > 0; ) {
      let t = -1;
      if (await navigator.locks.request(this.#f, () => {
        t = this.#i.findIndex(
          (e, i) => !!e && k(this.#r, this.#u[i], 0) && k(this.#n, this.#h[i], 1) && this.#o[i]
        ), t !== -1 && (this.#i[t] = 0, this.#n[t] = 1, this.#d--);
      }), t === -1) {
        await this.#_();
        continue;
      }
      await this.#c[t](...this.#m[t]), await navigator.locks.request(this.#f, () => {
        this.#n[t] = 0, this.#r[t] = 1, Atomics.add(this.#s, 1, 1);
      }), this.#E();
    }
    this.#l && Atomics.load(this.#s, 1) !== this.#c.length && await this.#y();
  }
  #p() {
    this.#a.postMessage(0);
  }
  #E() {
    Atomics.load(this.#s, 1) === this.#c.length ? this.#a.postMessage(2) : this.#a.postMessage(1);
  }
  async #_() {
    return new Promise((t) => this.#t = t);
  }
  async #y() {
    return new Promise((t) => this.#e = t);
  }
}
class kt {
  static fromWorld(t, e, i) {
    const s = it(
      e,
      i,
      st(e)
    ), r = s.reduce(function h(o, a, c) {
      for (const u of w(a))
        h(o, s[u], u);
      return o.includes(c) || o.push(c), o;
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
class jt {
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
    this.config = t, this.url = e, this.executor = t.threads > 1 ? Vt : kt, Yt(this);
  }
  addSystem(t) {
    return this.systems.push(t), this.#t.push(t.getAndClearDependencies()), t.parameters.forEach((e) => e.onAddSystem(this)), this;
  }
  addStartupSystem(t) {
    return this.#e.push(t), t.parameters.forEach((e) => e.onAddSystem(this)), this;
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
  registerThreadChannel(t) {
    return this.threadChannels.push(t), this;
  }
  setExecutor(t) {
    return this.executor = t, this;
  }
  async build() {
    const t = S.spawn(this.config.threads - 1, this.url), e = await t.wrapInQueue(
      () => new Xt(
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
    if (t.isMainThread) {
      await Promise.all(
        Array.from(
          e.resources.values(),
          (i) => i.initialize?.(e)
        )
      );
      for (const i of this.#e)
        await i.fn(
          ...i.parameters.map((s) => s.intoArgument(e))
        );
      await et.fn(e);
    }
    return e;
  }
}
class Zt {
  static fromWorld(t) {
    const e = t.threads.queue(() => {
      const s = t.components.reduce(
        (o, a) => o + a.size,
        0
      ), r = new Uint8Array(t.createBuffer(s));
      let h = 0;
      for (const o of t.components) {
        if (o.size === 0)
          continue;
        const a = new o();
        r.set(a.__$$s.u8, h), h += o.size;
      }
      return r;
    }), i = t.threads.queue(() => {
      let s = 0;
      return t.components.map((r) => {
        const h = s;
        return s += r.size, h;
      });
    });
    return new this(t, e, i);
  }
  #t = /* @__PURE__ */ new Map();
  #e = 0;
  #s;
  #i;
  #n;
  #r;
  #o;
  #h;
  #u;
  constructor(t, e, i) {
    this.#o = t, this.#h = e, this.#u = i;
    const s = t.createBuffer(64);
    this.#s = new Uint8Array(s), this.#i = new DataView(s), this.#n = t.entities, this.#r = t.components;
  }
  spawn() {
    const t = new f(this, this.#n.spawn());
    return this.insertTypeInto(t.id, f), t;
  }
  despawn(t) {
    return this.#t.set(t, 0n), this;
  }
  get(t) {
    return new f(this, t);
  }
  getData() {
    return [
      this.#t,
      this.#s.subarray(0, this.#e),
      this.#i
    ];
  }
  reset() {
    this.#t.clear(), this.#s.fill(0), this.#e = 0;
  }
  insertInto(t, e) {
    const i = e.constructor;
    this.#f(t, i), this.#s.set(
      e.__$$s.u8.subarray(e.__$$b, i.size),
      this.#e
    ), this.#e += C(i.size);
  }
  insertTypeInto(t, e) {
    if (this.#f(t, e), e.size === 0 || e === f)
      return;
    const i = this.#u[this.#r.indexOf(e)];
    this.#s.set(
      this.#h.subarray(i, i + e.size),
      this.#e
    ), this.#e += C(e.size);
  }
  #f(t, e) {
    this.#e + e.size + 16 > this.#s.byteLength && this.#c(e.size), this.#t.set(
      t,
      this.#a(t) | this.#l(e)
    ), !(e.size === 0 || e === f) && (this.#i.setBigUint64(this.#e, t), this.#i.setUint32(
      this.#e + 8,
      this.#r.indexOf(e)
    ), this.#e += 16);
  }
  removeFrom(t, e) {
    this.#t.set(
      t,
      this.#a(t) ^ this.#l(e)
    );
  }
  #a(t) {
    return this.#t.get(t) ?? this.#o.archetypes[this.#n.getTableIndex(t)].bitfield;
  }
  #l(t) {
    return 1n << BigInt(this.#r.indexOf(t));
  }
  #c(t) {
    t += 16;
    const e = this.#s.byteLength * 2, i = e > this.#e + t ? e : C(e + t), s = this.#s, r = this.#o.createBuffer(i);
    this.#s = new Uint8Array(r), this.#s.set(s), this.#i = new DataView(r);
  }
}
const Gt = (n = {}) => ({
  threads: 1,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...n
}), Ht = ({ threads: n }, t) => {
  n > 1 && (_(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), _(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), _(
    t,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), _(
    Number.isInteger(n) && 0 < n && n < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  );
};
function Jt(n, t) {
  const e = Gt(n);
  return P && Ht(e, t), e;
}
const j = 64;
class Xt {
  static new(t, e) {
    return new jt(Jt(t, e), e);
  }
  buffer;
  archetypeLookup = /* @__PURE__ */ new Map();
  tableLengths;
  archetypes = [];
  queries = [];
  resources = /* @__PURE__ */ new Map();
  systems = [];
  arguments = [];
  executor;
  commands;
  entities;
  config;
  threads;
  components;
  constructor(t, e, i, s, r, h, o, a) {
    this.buffer = t.threads > 1 ? SharedArrayBuffer : ArrayBuffer, this.config = t, this.threads = e, this.tableLengths = this.threads.queue(
      () => new Uint32Array(
        this.createBuffer(
          j * Uint32Array.BYTES_PER_ELEMENT
        )
      )
    ), this.archetypeLookup.set(0n, 1);
    const c = I.create(this, [f], 0n, 1);
    c.columns.set(
      f,
      this.threads.queue(() => c.columns.get(f))
    ), this.archetypes.push(new gt(this), c);
    for (const u of a)
      this.threads.setListener(
        u.channelName,
        u.onReceive(this)
      );
    this.components = s, this.entities = mt.fromWorld(this), this.commands = Zt.fromWorld(this), this.executor = i.fromWorld(this, h, o);
    for (const u of r)
      if (tt(u)) {
        const p = new u();
        p.__$$s = this.threads.queue(
          () => O(this.buffer, u, 1)
        ), this.resources.set(u, new u());
      } else
        e.isMainThread && this.resources.set(u, new u());
    for (const u of h)
      this.systems.push(u.fn), this.arguments.push(
        u.parameters.map((p) => p.intoArgument(this))
      );
  }
  createBuffer(t) {
    return new this.buffer(t);
  }
  async update() {
    return this.executor.start();
  }
  moveEntity(t, e) {
    if (!this.entities.isAlive(t))
      return;
    const i = this.archetypes[this.entities.getTableIndex(t)], s = this.#t(e);
    s.isFull && this.#e(s);
    const r = this.entities.getRow(t), h = i.move(r, s);
    e === 0n && s.incrementGeneration(r), this.entities.setRow(h, r), this.entities.setTableIndex(t, s.id), this.entities.setRow(t, s.size - 1);
  }
  #t(t) {
    if (this.archetypeLookup.has(t))
      return this.archetypes[this.archetypeLookup.get(t)];
    if (this.archetypes.length === this.tableLengths.length) {
      const s = this.tableLengths;
      this.tableLengths = new Uint32Array(
        this.createBuffer(
          s.length + j * Uint32Array.BYTES_PER_ELEMENT
        )
      ), this.tableLengths.set(s), this.threads.send(K(this.tableLengths));
    }
    const e = this.archetypes.length, i = I.create(
      this,
      [...w(t)].map((s) => this.components[s]),
      t,
      e
    );
    this.archetypeLookup.set(t, e), this.archetypes.push(i), this.threads.send(
      J(
        [...i.columns.values()],
        i.capacity,
        e,
        t
      )
    );
    for (const s of this.queries)
      s.testAdd(t, i);
    return i;
  }
  #e(t) {
    t.grow(this), this.threads.send(
      X(t.id, t.capacity, [...t.columns.values()])
    );
  }
}
function te(n) {
  return n;
}
export {
  f as Entity,
  Xt as World,
  et as applyCommands,
  z as createThreadChannel,
  te as definePlugin,
  Ot as defineSystem,
  G as initStruct,
  l as struct
};
