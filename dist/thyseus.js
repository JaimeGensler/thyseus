import { DEV as I } from "esm-env";
class et {
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
class st {
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
      (o) => new o({}, 0, r)
    );
  }
  get size() {
    return this.#t.reduce((t, e) => t + e.size, 0);
  }
  *[Symbol.iterator]() {
    this.#e >= this.#s.length && this.#s.push(
      ...this.#r.map(
        (i) => new i({}, 0, this.#h)
      )
    );
    const t = this.#s.slice(
      this.#e,
      this.#e + this.#r.length
    ), e = this.#e;
    this.#e += this.#r.length;
    for (const i of this.#t) {
      t.forEach((s, r) => {
        const o = this.#s[r + e], h = i.columns.get(o.constructor);
        h ? (t[r] = o, t[r].__$$s = h) : t[r] = null;
      });
      for (let s = 0; s < i.size; s++) {
        for (const r of t)
          r && (r.__$$i = s);
        this.#o ? yield t[0] : yield t;
      }
    }
  }
  testAdd(t, e) {
    this.#c(t) && this.#t.push(e);
  }
  #c(t) {
    for (let e = 0; e < this.#i.length; e++)
      if ((this.#i[e] & t) === this.#i[e] && (this.#n[e] & t) === 0n)
        return !0;
    return !1;
  }
}
class M {
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
class U {
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
function p(n, t, e = Error) {
  if (!n)
    throw new e(t);
}
const P = (n, t, e = []) => (Array.isArray(t) ? t : [t]).reduce(
  (i, s, r) => e[r] ? i : i | 1n << BigInt(n.indexOf(s)),
  0n
);
function b(n, t, e) {
  let i = e;
  for (const s of Array.isArray(n) ? n : [n])
    i = t(i, s);
  return i;
}
function it(n, t) {
  b(t, function e(i, s) {
    s instanceof U || s instanceof W ? (Array.isArray(s.value) ? s.value : [s.value]).forEach(
      (r) => n.registerComponent(r)
    ) : s instanceof N && (b(s.l, e), b(s.r, e));
  });
}
function nt(n, t, e, i) {
  const s = b(
    i,
    function o(h, a) {
      if (a instanceof U) {
        const c = P(
          n,
          a.value
        );
        return {
          withs: h.withs.map((u) => u | c),
          withouts: h.withouts
        };
      } else if (a instanceof W) {
        const c = P(
          n,
          a.value
        );
        return {
          withs: h.withs,
          withouts: h.withouts.map((u) => u | c)
        };
      } else if (a instanceof N) {
        const c = b(a.l, o, h), u = b(a.r, o, h);
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
        P(n, t, e)
      ],
      withouts: [0n]
    }
  ), r = s.withs.reduce(
    (o, h, a) => (s.withs[a] & s.withouts[a]) === 0n ? o.add(a) : o,
    /* @__PURE__ */ new Set()
  );
  return s.withs = s.withs.filter((o, h) => r.has(h)), s.withouts = s.withouts.filter((o, h) => r.has(h)), I && p(
    s.withs.length > 0,
    "Tried to construct a query that cannot match any entities."
  ), s;
}
class O {
  components = [];
  writes = [];
  optionals = [];
  filters;
  isIndividual;
  constructor(t, e = []) {
    this.isIndividual = !Array.isArray(t);
    const i = Array.isArray(t) ? t : [t];
    for (const s of i) {
      const r = s instanceof $ || s instanceof M && s.value instanceof $;
      this.writes.push(r), this.optionals.push(s instanceof M);
      const o = s instanceof $ ? s.value : s instanceof M ? s.value instanceof $ ? s.value.value : s.value : s;
      I && p(
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
    return t instanceof O ? this.components.some(
      (e, i) => t.components.some(
        (s, r) => e === s && (this.writes[i] || t.writes[r])
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e)), it(t, this.filters);
  }
  intoArgument(t) {
    const { withs: e, withouts: i } = nt(
      t.components,
      this.components,
      this.optionals,
      this.filters
    ), s = new st(e, i, this.isIndividual, this.components, t.commands);
    return t.queries.push(s), s;
  }
}
let q = 0, T = 1, C = 0, m = [], _ = [], E = {};
const y = {
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
}, rt = (n, t, e) => {
  const i = _.reduce(
    (r, o, h) => o < t && h < r ? h : r,
    _.length
  );
  if (i === _.length) {
    m.push(n), _.push(t), E[n] = m.length === 0 ? 0 : C;
    return;
  }
  const s = m[i];
  m.splice(i, 0, n), _.splice(i, 0, t), E[n] = E[s];
  for (let r = i + 1; r < m.length; r++)
    E[m[r]] += e;
};
function S(n, t, e, i = 0) {
  return T = Math.max(T, t), q |= i, rt(n, t, e), C += e, E;
}
function ot() {
  const n = {
    schema: q,
    size: Math.ceil(C / T) * T,
    alignment: T
  };
  q = 0, C = 0, T = 1;
  for (let t = 0; t < m.length; t++)
    E[m[t]] /= _[t];
  return E = {}, m.length = 0, _.length = 0, n;
}
function d(n) {
  return function() {
    return function(e, i) {
      const s = D[n], r = S(
        i,
        s.BYTES_PER_ELEMENT,
        s.BYTES_PER_ELEMENT,
        y[n]
      ), o = 31 - Math.clz32(s.BYTES_PER_ELEMENT);
      Object.defineProperty(e, i, {
        enumerable: !0,
        get() {
          return this.__$$s[n][(this.__$$b >> o) + r[i]];
        },
        set(h) {
          this.__$$s[n][(this.__$$b >> o) + r[i]] = h;
        }
      });
    };
  };
}
const ht = d("u8"), at = d("u16"), ut = d("u32"), ct = d("u64"), lt = d("i8"), ft = d("i16"), dt = d("i32"), mt = d("i64"), gt = d("f32"), pt = d("f64"), _t = function() {
  return function(t, e) {
    const i = S(
      e,
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
      y.u8
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
}, Et = new TextEncoder(), wt = new TextDecoder();
function yt({
  characterCount: n,
  byteLength: t
}) {
  return function(i, s) {
    t ??= n * 3;
    const r = S(
      s,
      Uint8Array.BYTES_PER_ELEMENT,
      t
    );
    Object.defineProperty(i, s, {
      enumerable: !0,
      get() {
        return wt.decode(
          this.__$$s.u8.subarray(
            this.__$$b + r[s],
            this.__$$b + r[s] + t
          )
        ).split("\0")[0];
      },
      set(o) {
        Et.encodeInto(
          o,
          this.__$$s.u8.subarray(
            this.__$$b + r[s],
            this.__$$b + r[s] + t
          ).fill(0)
        );
      }
    });
  };
}
function $t({ type: n, length: t }) {
  return function(i, s) {
    const r = D[n], o = S(
      s,
      r.BYTES_PER_ELEMENT,
      r.BYTES_PER_ELEMENT * t,
      y[n]
    ), h = 31 - Math.clz32(r.BYTES_PER_ELEMENT);
    Object.defineProperty(i, s, {
      enumerable: !0,
      get() {
        return this.__$$s[n].subarray(
          (this.__$$b >> h) + o[s],
          (this.__$$b >> h) + o[s] + t
        );
      },
      set(a) {
        this.__$$s[n].set(
          a.subarray(0, t),
          (this.__$$b >> h) + o[s]
        );
      }
    });
  };
}
function Tt(n) {
  return function(e, i) {
    const s = S(
      i,
      n.alignment,
      n.size,
      n.schema
    );
    Object.defineProperty(e, i, {
      enumerable: !0,
      get() {
        const r = new n(this.__$$s, 0, {});
        return r.__$$b = this.__$$b + s[i] * n.alignment, r;
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
function f() {
  return function(t) {
    const { schema: e, size: i, alignment: s } = ot();
    return class extends t {
      static schema = e | (t.schema ?? 0);
      static size = i;
      static alignment = s;
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
f.bool = _t;
f.u8 = ht;
f.u16 = at;
f.u32 = ut;
f.u64 = ct;
f.i8 = lt;
f.i16 = ft;
f.i32 = dt;
f.i64 = mt;
f.f32 = gt;
f.f64 = pt;
f.string = yt;
f.array = $t;
f.substruct = Tt;
function Q(n) {
  return typeof n == "function" && typeof n.size == "number" && typeof n.alignment == "number" && typeof n.schema == "number";
}
class Y {
  resource;
  canWrite;
  constructor(t) {
    const e = t instanceof $;
    this.resource = e ? t.value : t, this.canWrite = e;
  }
  isLocalToThread() {
    return !Q(this.resource);
  }
  intersectsWith(t) {
    return t instanceof Y ? this.resource === t.resource && (this.canWrite || t.canWrite) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class bt {
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
const At = {
  Commands: g(et),
  Query: g(O),
  Res: g(Y),
  World: g(bt),
  Mut: g($),
  Optional: g(M),
  With: g(U),
  Without: g(W),
  Or(n, t) {
    return new N(n, t);
  }
};
class St {
  #t = 0;
  #e = [];
  #s;
  fn;
  constructor(t, e) {
    this.#s = t, this.fn = e;
  }
  get parameters() {
    return this.#s(At);
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
  getAndClearDependencies() {
    const t = {
      dependencies: this.#e,
      implicitPosition: this.#t
    };
    return this.#e = [], this.#t = 0, t;
  }
}
function zt(n, t) {
  return new St(n, t);
}
class l {
  static schema = y.u64 | y.u32;
  static size = 8;
  __$$s;
  __$$b;
  #t;
  #e;
  constructor(t, e, i) {
    this.__$$s = t, this.#t = e, this.__$$b = e * l.size, this.#e = i;
  }
  get __$$i() {
    return this.#t;
  }
  set __$$i(t) {
    this.#t = t, this.__$$b = t * l.size;
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
    return this.#e.insertInto(this.id, t), this;
  }
  remove(t) {
    return this.#e.removeFrom(this.id, t), this;
  }
  despawn() {
    this.#e.despawn(this.id);
  }
}
const [, ...vt] = Object.entries(D);
function j(n, t) {
  return vt.reduce((e, [i, s]) => ((y[i] & n.schema) === y[i] && (e[i] = new s(e.buffer)), e), t);
}
function Z(n, t, e) {
  const i = n.createBuffer(t.size * e);
  return j(t, {
    buffer: i,
    u8: new Uint8Array(i)
  });
}
function Bt(n, t, e) {
  const i = new n.buffer.constructor(
    t.size * e
  ), s = new Uint8Array(i);
  return s.set(n.u8), n.buffer = i, n.u8 = s, j(t, n);
}
class L {
  static create(t, e, i, s) {
    const r = t.config.getNewTableSize(0);
    return new this(
      t,
      e.reduce((o, h) => (h.size > 0 && o.set(h, Z(t, h, r)), o), /* @__PURE__ */ new Map()),
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
    const i = this.columns.get(l).u64[this.size - 1];
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
      this.columns.set(e, Bt(i, e, this.capacity));
  }
  incrementGeneration(t) {
    this.columns.get(l).u32[(t << 1) + 1]++;
  }
}
const Mt = 0x00000000ffffffffn, v = (n) => Number(n & Mt), R = 256;
class Ct {
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
        return this.#i.columns.get(l).u64[t - e - 1];
    return BigInt(Atomics.add(this.#s, 0, 1));
  }
  isAlive(t) {
    const e = this.getTableIndex(t), i = this.getRow(t);
    return e === 0 || this.#t.archetypes[e].columns.get(l).u64[i] === t;
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
    i.set(this.#e), this.#e = i, t.threads.send(Pt(this.#e));
  }
  setLocations(t) {
    this.#e = t;
  }
  getTableIndex(t) {
    return this.#e[v(t) << 1] ?? 0;
  }
  setTableIndex(t, e) {
    this.#e[v(t) << 1] = e;
  }
  getRow(t) {
    return this.#e[(v(t) << 1) + 1] ?? 0;
  }
  setRow(t, e) {
    this.#e[(v(t) << 1) + 1] = e;
  }
}
class Lt extends L {
  constructor(t) {
    super(t, /* @__PURE__ */ new Map(), 0, 0n, 0);
  }
  get isFull() {
    return !1;
  }
  move(t, e) {
    const i = BigInt(t);
    return e.columns.get(l).u64[e.size] = i, e.size++, i;
  }
}
function* w(n) {
  let t = 0;
  for (; n !== 0n; )
    (n & 1n) === 1n && (yield t), n >>= 1n, t++;
}
let It = 1;
function z(n, t) {
  function e(...i) {
    return [n, It++, i];
  }
  return e.channelName = n, e.onReceive = t, e;
}
const xt = [];
class A {
  static isMainThread = !!globalThis.document;
  isMainThread = A.isMainThread;
  static spawn(t, e) {
    return new this(
      A.isMainThread ? Array.from(
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
      data: [s, r, o]
    }) => {
      if (this.#t.has(r)) {
        const h = this.#e.get(r);
        h.push(o), h.length === this.#n.length && (this.#t.get(r)(h), this.#t.delete(r), this.#e.delete(r));
      } else
        s in this.#s ? i.postMessage([
          s,
          r,
          this.#s[s](...o)
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
    return this.#n.length === 0 ? Promise.resolve(xt) : new Promise((e) => {
      for (const i of this.#n)
        i.postMessage(t);
      this.#e.set(t[1], []), this.#t.set(t[1], e);
    });
  }
  queue(t) {
    if (A.isMainThread) {
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
const V = z(
  "thyseus::getCommandQueue",
  (n) => () => {
    const t = new Map(n.commands.queue);
    return n.commands.queue.clear(), t;
  }
), G = z(
  "thyseus::sendTable",
  (n) => (t, e, i, s) => {
    const r = [...w(s)].reduce((h, a, c) => (n.components[a].size > 0 && h.set(n.components[a], t.shift()), h), /* @__PURE__ */ new Map()), o = new L(n, r, e, s, i);
    n.archetypes[i] = o;
    for (const h of n.queries)
      h.testAdd(s, o);
  }
), H = z(
  "thyseus::resizeTable",
  (n) => (t, e, i) => {
    const s = n.archetypes[t];
    s.capacity = e;
    let r = 0;
    for (const o of s.columns.keys())
      s.columns.set(o, i[r++]);
  }
), J = z(
  "thyseus::resizeTableLengths",
  (n) => (t) => {
    n.tableLengths = t;
  }
), Pt = z(
  "thyseus::resizeEntityLocations",
  (n) => (t) => {
    n.entities.setLocations(t);
  }
), Rt = (n, t) => {
  for (const [e, i] of t) {
    const s = n.get(e);
    s === void 0 ? n.set(e, i) : s !== 0n && n.set(e, s | i);
  }
  return n;
}, X = zt(
  ({ World: n }) => [n()],
  async function(t) {
    t.entities.isFull && t.entities.grow(t);
    const e = (await t.threads.send(V())).reduce(
      Rt,
      t.commands.queue
    );
    for (const [i, s] of e)
      t.moveEntity(i, s);
    e.clear(), t.entities.resetCursor();
  }
);
function qt(n) {
  n.registerComponent(l), n.addSystem(X.afterAll()), n.registerThreadChannel(V), n.registerThreadChannel(G), n.registerThreadChannel(H), n.registerThreadChannel(J);
}
function Ut(n, t) {
  return n.parameters.some(
    (e) => t.parameters.some(
      (i) => e.intersectsWith(i) || i.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function K(n) {
  return n.map(
    (t) => n.reduce(
      (e, i, s) => e | BigInt(Ut(t, i)) << BigInt(s),
      0n
    )
  );
}
function tt(n, t, e) {
  const i = t.map(
    (r) => r.dependencies.reduce((o, h) => {
      const a = n.indexOf(h);
      return a === -1 ? o : o | 1n << BigInt(a);
    }, 0n)
  ), s = [...i];
  s.forEach(function r(o, h) {
    for (const a of w(o))
      r(s[a], a), s[h] |= s[a];
  }), I && s.forEach((r, o) => {
    p(
      (r & 1n << BigInt(o)) === 0n,
      `Circular Dependency Detected - Sytem #${o} (${n[o].fn.name}) depends on itself!`
    );
  });
  for (let r = 0; r < n.length; r++) {
    const o = t[r];
    if (o.implicitPosition === -1)
      for (const h of w(e[r]))
        h !== r && (s[r] & 1n << BigInt(h)) === 0n && (i[h] |= 1n << BigInt(r), s[h] |= 1n << BigInt(r));
    else if (o.implicitPosition === 1)
      for (const h of w(e[r]))
        h !== r && (s[h] & 1n << BigInt(r)) === 0n && (i[r] |= 1n << BigInt(h), s[r] |= 1n << BigInt(h));
  }
  return i.forEach((r, o) => i[o] &= e[o]), i;
}
function F(n, t, e) {
  for (const i of w(t))
    if (n[i] === e)
      return !1;
  return !0;
}
let Wt = 0;
const B = (...n) => {
};
class Nt {
  static fromWorld(t, e, i) {
    const s = t.threads.queue(
      () => K(e)
    ), r = t.threads.queue(
      () => tt(e, i, s)
    ), o = t.threads.isMainThread ? e.map(() => !0) : e.map((c) => !c.parameters.some((u) => u.isLocalToThread())), h = t.threads.queue(
      () => t.createBuffer(8 + e.length * 3)
    ), a = t.threads.queue(
      () => `thyseus::ParallelExecutor${Wt++}`
    );
    return new this(
      t,
      new Uint32Array(h, 0, 2),
      new Uint8Array(h, 8, e.length),
      new Uint8Array(h, 8 + e.length, e.length),
      new Uint8Array(h, 8 + e.length * 2, e.length),
      s,
      r,
      o,
      a
    );
  }
  #t = B;
  #e = B;
  #s;
  #i;
  #n;
  #r;
  #o;
  #h;
  #c;
  #f;
  #a;
  #d;
  #u;
  #m;
  constructor(t, e, i, s, r, o, h, a, c) {
    this.#u = t.systems, this.#m = t.arguments, this.#d = t.threads.isMainThread, this.#h = o, this.#c = h, this.#o = a, this.#s = e, this.#i = i, this.#n = s, this.#r = r, this.#a = new BroadcastChannel(c), this.#f = c, this.#a.addEventListener(
      "message",
      ({ data: u }) => {
        u === 0 ? this.#g() : u === 1 ? (this.#t(), this.#t = B) : (this.#e(), this.#e = B);
      }
    );
  }
  async start() {
    return this.#l = this.#u.length, this.#s[1] = 0, this.#i.fill(1), this.#r.fill(0), this.#n.fill(0), this.#p(), this.#g();
  }
  get #l() {
    return this.#s[0];
  }
  set #l(t) {
    this.#s[0] = t;
  }
  async #g() {
    for (; this.#l > 0; ) {
      let t = -1;
      if (await navigator.locks.request(this.#f, () => {
        t = this.#i.findIndex(
          (e, i) => !!e && F(this.#r, this.#c[i], 0) && F(this.#n, this.#h[i], 1) && this.#o[i]
        ), t !== -1 && (this.#i[t] = 0, this.#n[t] = 1, this.#l--);
      }), t === -1) {
        await this.#E();
        continue;
      }
      await this.#u[t](...this.#m[t]), await navigator.locks.request(this.#f, () => {
        this.#n[t] = 0, this.#r[t] = 1, Atomics.add(this.#s, 1, 1);
      }), this.#_();
    }
    this.#d && Atomics.load(this.#s, 1) !== this.#u.length && await this.#w();
  }
  #p() {
    this.#a.postMessage(0);
  }
  #_() {
    Atomics.load(this.#s, 1) === this.#u.length ? this.#a.postMessage(2) : this.#a.postMessage(1);
  }
  async #E() {
    return new Promise((t) => this.#t = t);
  }
  async #w() {
    return new Promise((t) => this.#e = t);
  }
}
class Ot {
  static fromWorld(t, e, i) {
    const s = tt(
      e,
      i,
      K(e)
    ), r = s.reduce(function o(h, a, c) {
      for (const u of w(a))
        o(h, s[u], u);
      return h.includes(c) || h.push(c), h;
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
class Dt {
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
    this.config = t, this.url = e, this.executor = t.threads > 1 ? Nt : Ot, qt(this);
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
    const t = A.spawn(this.config.threads - 1, this.url), e = await t.wrapInQueue(
      () => new jt(
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
      await X.fn(e);
    }
    return e;
  }
}
class Yt {
  static fromWorld(t) {
    return new this(t, t.entities, t.components);
  }
  queue = /* @__PURE__ */ new Map();
  #t;
  #e;
  #s;
  #i;
  #n;
  constructor(t, e, i) {
    this.#t = t, this.#e = e;
    const s = new ArrayBuffer(8);
    this.#i = new BigUint64Array(1), this.#s = new l(
      {
        buffer: s,
        u8: new Uint8Array(s),
        u32: new Uint32Array(s),
        u64: this.#i
      },
      0,
      this
    ), this.#n = i;
  }
  spawn() {
    const t = this.#e.spawn();
    return this.#i[0] = t, this.insertInto(t, l), this.#s;
  }
  despawn(t) {
    return this.queue.set(t, 0n), this;
  }
  get(t) {
    return this.#i[0] = t, this.#s;
  }
  insertInto(t, e) {
    this.queue.set(
      t,
      this.#r(t) | 1n << BigInt(this.#n.indexOf(e))
    );
  }
  removeFrom(t, e) {
    this.queue.set(
      t,
      this.#r(t) ^ 1n << BigInt(this.#n.indexOf(e))
    );
  }
  #r(t) {
    return this.queue.get(t) ?? this.#t.archetypes[this.#e.getTableIndex(t)].bitfield;
  }
}
const Ft = (n = {}) => ({
  threads: 1,
  maxEntities: 2 ** 16,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...n
}), kt = ({ threads: n, maxEntities: t }, e) => {
  n > 1 && (p(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), p(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), p(
    e,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), p(
    Number.isInteger(n) && 0 < n && n < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  ), p(
    Number.isInteger(t) && 0 < t && t < 2 ** 32,
    "Invalid config - 'maxEntities' must be an integer such that 0 < maxEntities < 2**32",
    RangeError
  );
};
function Qt(n, t) {
  const e = Ft(n);
  return I && kt(e, t), e;
}
const k = 64;
class jt {
  static new(t, e) {
    return new Dt(Qt(t, e), e);
  }
  #t;
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
  constructor(t, e, i, s, r, o, h, a) {
    this.#t = t.threads > 1 ? SharedArrayBuffer : ArrayBuffer, this.config = t, this.threads = e, this.tableLengths = this.threads.queue(
      () => new Uint32Array(
        this.createBuffer(
          k * Uint32Array.BYTES_PER_ELEMENT
        )
      )
    ), this.archetypeLookup.set(0n, 1);
    const c = L.create(this, [l], 0n, 1);
    c.columns.set(
      l,
      this.threads.queue(() => c.columns.get(l))
    ), this.archetypes.push(new Lt(this), c);
    for (const u of a)
      this.threads.setListener(
        u.channelName,
        u.onReceive(this)
      );
    this.components = s, this.entities = Ct.fromWorld(this), this.commands = Yt.fromWorld(this), this.executor = i.fromWorld(this, o, h);
    for (const u of r)
      if (Q(u)) {
        const x = this.threads.queue(
          () => Z(this, u, 1)
        );
        this.resources.set(
          u,
          new u(x, 0, this.commands)
        );
      } else
        e.isMainThread && this.resources.set(u, new u());
    for (const u of o)
      this.systems.push(u.fn), this.arguments.push(
        u.parameters.map((x) => x.intoArgument(this))
      );
  }
  createBuffer(t) {
    return new this.#t(t);
  }
  async update() {
    return this.executor.start();
  }
  moveEntity(t, e) {
    if (!this.entities.isAlive(t))
      return;
    const i = this.archetypes[this.entities.getTableIndex(t)], s = this.#e(e);
    s.isFull && this.#s(s);
    const r = this.entities.getRow(t), o = i.move(r, s);
    e === 0n && s.incrementGeneration(r), this.entities.setRow(o, r), this.entities.setTableIndex(t, s.id), this.entities.setRow(t, s.size - 1);
  }
  #e(t) {
    if (this.archetypeLookup.has(t))
      return this.archetypes[this.archetypeLookup.get(t)];
    if (this.archetypes.length === this.tableLengths.length) {
      const s = this.tableLengths;
      this.tableLengths = new Uint32Array(
        this.createBuffer(
          s.length + k * Uint32Array.BYTES_PER_ELEMENT
        )
      ), this.tableLengths.set(s), this.threads.send(J(this.tableLengths));
    }
    const e = this.archetypes.length, i = L.create(
      this,
      [...w(t)].map((s) => this.components[s]),
      t,
      e
    );
    this.archetypeLookup.set(t, e), this.archetypes.push(i), this.threads.send(
      G(
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
  #s(t) {
    t.grow(this), this.threads.send(
      H(t.id, t.capacity, [...t.columns.values()])
    );
  }
}
function Vt(n) {
  return n;
}
export {
  l as Entity,
  jt as World,
  X as applyCommands,
  z as createThreadChannel,
  Vt as definePlugin,
  zt as defineSystem,
  f as struct
};
