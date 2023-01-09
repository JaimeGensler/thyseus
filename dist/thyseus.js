import { DEV as I } from "esm-env";
class tt {
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
class et {
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
class A {
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
const x = (n, t, e = []) => (Array.isArray(t) ? t : [t]).reduce(
  (i, s, r) => e[r] ? i : i | 1n << BigInt(n.indexOf(s)),
  0n
);
function b(n, t, e) {
  let i = e;
  for (const s of Array.isArray(n) ? n : [n])
    i = t(i, s);
  return i;
}
function st(n, t) {
  b(t, function e(i, s) {
    s instanceof P || s instanceof U ? (Array.isArray(s.value) ? s.value : [s.value]).forEach(
      (r) => n.registerComponent(r)
    ) : s instanceof W && (b(s.l, e), b(s.r, e));
  });
}
function it(n, t, e, i) {
  const s = b(
    i,
    function o(h, a) {
      if (a instanceof P) {
        const u = x(
          n,
          a.value
        );
        return {
          withs: h.withs.map((f) => f | u),
          withouts: h.withouts
        };
      } else if (a instanceof U) {
        const u = x(
          n,
          a.value
        );
        return {
          withs: h.withs,
          withouts: h.withouts.map((f) => f | u)
        };
      } else if (a instanceof W) {
        const u = b(a.l, o, h), f = b(a.r, o, h);
        return {
          withs: [...u.withs, ...f.withs],
          withouts: [...u.withouts, ...f.withouts]
        };
      }
      throw new Error(
        `Unrecognized filter (${a.constructor.name}) in Query.`
      );
    },
    {
      withs: [
        x(n, t, e)
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
class N {
  components = [];
  writes = [];
  optionals = [];
  filters;
  isIndividual;
  constructor(t, e = []) {
    this.isIndividual = !Array.isArray(t);
    const i = Array.isArray(t) ? t : [t];
    for (const s of i) {
      const r = s instanceof A || s instanceof M && s.value instanceof A;
      this.writes.push(r), this.optionals.push(s instanceof M);
      const o = s instanceof A ? s.value : s instanceof M ? s.value instanceof A ? s.value.value : s.value : s;
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
    return t instanceof N ? this.components.some(
      (e, i) => t.components.some(
        (s, r) => e === s && (this.writes[i] || t.writes[r])
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e)), st(t, this.filters);
  }
  intoArgument(t) {
    const { withs: e, withouts: i } = it(
      t.components,
      this.components,
      this.optionals,
      this.filters
    ), s = new et(e, i, this.isIndividual, this.components, t.commands);
    return t.queries.push(s), s;
  }
}
let q = 0, $ = 1, L = 0, m = [], _ = [], E = {};
const w = {
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
}, O = {
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
}, nt = (n, t, e) => {
  const i = _.reduce(
    (r, o, h) => o < t && h < r ? h : r,
    _.length
  );
  if (i === _.length) {
    m.push(n), _.push(t), E[n] = m.length === 0 ? 0 : L;
    return;
  }
  const s = m[i];
  m.splice(i, 0, n), _.splice(i, 0, t), E[n] = E[s];
  for (let r = i + 1; r < m.length; r++)
    E[m[r]] += e;
};
function S(n, t, e, i = 0) {
  return $ = Math.max($, t), q |= i, nt(n, t, e), L += e, E;
}
function rt() {
  const n = {
    schema: q,
    size: Math.ceil(L / $) * $,
    alignment: $
  };
  q = 0, L = 0, $ = 1;
  for (let t = 0; t < m.length; t++)
    E[m[t]] /= _[t];
  return E = {}, m.length = 0, _.length = 0, n;
}
function d(n) {
  return function() {
    return function(e, i) {
      const s = O[n], r = S(
        i,
        s.BYTES_PER_ELEMENT,
        s.BYTES_PER_ELEMENT,
        w[n]
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
const ot = d("u8"), ht = d("u16"), ut = d("u32"), at = d("u64"), ct = d("i8"), lt = d("i16"), ft = d("i32"), dt = d("i64"), mt = d("f32"), gt = d("f64"), pt = function() {
  return function(t, e) {
    const i = S(
      e,
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
      w.u8
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
}, _t = new TextEncoder(), Et = new TextDecoder();
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
        return Et.decode(
          this.__$$s.u8.subarray(
            this.__$$b + r[s],
            this.__$$b + r[s] + t
          )
        ).split("\0")[0];
      },
      set(o) {
        _t.encodeInto(
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
function wt({ type: n, length: t }) {
  return function(i, s) {
    const r = O[n], o = S(
      s,
      r.BYTES_PER_ELEMENT,
      r.BYTES_PER_ELEMENT * t,
      w[n]
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
function At(n) {
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
function l() {
  return function(t) {
    const { schema: e, size: i, alignment: s } = rt();
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
l.bool = pt;
l.u8 = ot;
l.u16 = ht;
l.u32 = ut;
l.u64 = at;
l.i8 = ct;
l.i16 = lt;
l.i32 = ft;
l.i64 = dt;
l.f32 = mt;
l.f64 = gt;
l.string = yt;
l.array = wt;
l.substruct = At;
function k(n) {
  return typeof n == "function" && typeof n.size == "number" && typeof n.alignment == "number" && typeof n.schema == "number";
}
class D {
  resource;
  canWrite;
  constructor(t) {
    const e = t instanceof A;
    this.resource = e ? t.value : t, this.canWrite = e;
  }
  isLocalToThread() {
    return !k(this.resource);
  }
  intersectsWith(t) {
    return t instanceof D ? this.resource === t.resource && (this.canWrite || t.canWrite) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class $t {
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
const bt = {
  Commands: g(tt),
  Query: g(N),
  Res: g(D),
  World: g($t),
  Mut: g(A),
  Optional: g(M),
  With: g(P),
  Without: g(U),
  Or(n, t) {
    return new W(n, t);
  }
};
class Tt {
  isBeforeAll = !1;
  isAfterAll = !1;
  dependencies = [];
  dependents = [];
  #t;
  fn;
  constructor(t, e) {
    this.#t = t, this.fn = e;
  }
  get parameters() {
    return this.#t(bt);
  }
  before(t) {
    return this.dependents.push(t), t.dependencies.push(this), this;
  }
  after(t) {
    return this.dependencies.push(t), t.dependents.push(this), this;
  }
  beforeAll() {
    return this.isAfterAll = !1, this.isBeforeAll = !0, this;
  }
  afterAll() {
    return this.isBeforeAll = !1, this.isAfterAll = !0, this;
  }
  getArguments(t) {
    return this.parameters.map((e) => e.intoArgument(t));
  }
}
function St(n, t) {
  return new Tt(n, t);
}
class c {
  static schema = w.u64 | w.u32;
  static size = 8;
  __$$s;
  __$$b;
  #t;
  #e;
  constructor(t, e, i) {
    this.__$$s = t, this.#t = e, this.__$$b = e * c.size, this.#e = i;
  }
  get __$$i() {
    return this.#t;
  }
  set __$$i(t) {
    this.#t = t, this.__$$b = t * c.size;
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
const [, ...Bt] = Object.entries(O);
function Q(n, t) {
  return Bt.reduce((e, [i, s]) => ((w[i] & n.schema) === w[i] && (e[i] = new s(e.buffer)), e), t);
}
function j(n, t, e) {
  const i = n.createBuffer(t.size * e);
  return Q(t, {
    buffer: i,
    u8: new Uint8Array(i)
  });
}
function zt(n, t, e) {
  const i = new n.buffer.constructor(
    t.size * e
  ), s = new Uint8Array(i);
  return s.set(n.u8), n.buffer = i, n.u8 = s, Q(t, n);
}
class C {
  static create(t, e, i, s) {
    const r = t.config.getNewTableSize(0);
    return new this(
      t,
      e.reduce((o, h) => (h.size > 0 && o.set(h, j(t, h, r)), o), /* @__PURE__ */ new Map()),
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
    const i = this.columns.get(c).u64[this.size - 1];
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
      this.columns.set(e, zt(i, e, this.capacity));
  }
  incrementGeneration(t) {
    this.columns.get(c).u32[(t << 1) + 1]++;
  }
}
const vt = 0x00000000ffffffffn, z = (n) => Number(n & vt), R = 256;
class Mt {
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
        return this.#i.columns.get(c).u64[t - e - 1];
    return BigInt(Atomics.add(this.#s, 0, 1));
  }
  isAlive(t) {
    const e = this.getTableIndex(t), i = this.getRow(t);
    return e === 0 || this.#t.archetypes[e].columns.get(c).u64[i] === t;
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
    i.set(this.#e), this.#e = i, t.threads.send(It(this.#e));
  }
  setLocations(t) {
    this.#e = t;
  }
  getTableIndex(t) {
    return this.#e[z(t) << 1] ?? 0;
  }
  setTableIndex(t, e) {
    this.#e[z(t) << 1] = e;
  }
  getRow(t) {
    return this.#e[(z(t) << 1) + 1] ?? 0;
  }
  setRow(t, e) {
    this.#e[(z(t) << 1) + 1] = e;
  }
}
class Lt extends C {
  constructor(t) {
    super(t, /* @__PURE__ */ new Map(), 0, 0n, 0);
  }
  get isFull() {
    return !1;
  }
  move(t, e) {
    const i = BigInt(t);
    return e.columns.get(c).u64[e.size] = i, e.size++, i;
  }
}
function* y(n) {
  let t = 0;
  for (; n !== 0n; )
    (n & 1n) === 1n && (yield t), n >>= 1n, t++;
}
let Ct = 1;
function B(n, t) {
  function e(...i) {
    return [n, Ct++, i];
  }
  return e.channelName = n, e.onReceive = t, e;
}
class T {
  static isMainThread = !!globalThis.document;
  isMainThread = T.isMainThread;
  static spawn(t, e) {
    return new this(
      T.isMainThread ? Array.from(
        { length: t },
        () => new Worker(e, { type: "module" })
      ) : [globalThis]
    );
  }
  #t = /* @__PURE__ */ new Map();
  #e = {};
  #s = [];
  #i;
  constructor(t) {
    this.#i = t;
    const e = ({
      currentTarget: i,
      data: [s, r, o]
    }) => {
      this.#t.has(r) ? (this.#t.get(r)(o), this.#t.delete(r)) : s in this.#e ? i.postMessage([
        s,
        r,
        this.#e[s](...o)
      ]) : i.postMessage([s, r, null]);
    };
    for (const i of this.#i)
      i.addEventListener("message", e);
  }
  setListener(t, e) {
    this.#e[t] = e;
  }
  deleteListener(t) {
    delete this.#e[t];
  }
  send(t) {
    return Promise.all(
      this.#i.map((e) => (e.postMessage(t), new Promise((i) => this.#t.set(t[1], i))))
    );
  }
  queue(t) {
    if (T.isMainThread) {
      const e = t();
      return this.#s.push(e), e;
    }
    return this.#s.shift();
  }
  async wrapInQueue(t) {
    const e = "threadGroup::queue";
    let i;
    return this.isMainThread ? (i = await t(), await this.send([e, 0, [this.#s]])) : (i = await new Promise(
      (s) => this.setListener(e, (r) => {
        this.#s = r, s(t());
      })
    ), this.deleteListener(e)), this.#s.length = 0, i;
  }
}
const Z = B(
  "thyseus::getCommandQueue",
  (n) => () => {
    const t = new Map(n.commands.queue);
    return n.commands.queue.clear(), t;
  }
), V = B(
  "thyseus::sendTable",
  (n) => (t, e, i, s) => {
    const r = [...y(s)].reduce((h, a, u) => (n.components[a].size > 0 && h.set(n.components[a], t[u]), h), /* @__PURE__ */ new Map()), o = new C(n, r, e, s, i);
    n.archetypes[i] = o;
    for (const h of n.queries)
      h.testAdd(s, o);
  }
), G = B(
  "thyseus::resizeTable",
  (n) => (t, e, i) => {
    const s = n.archetypes[t];
    s.capacity = e;
    let r = 0;
    for (const o of s.columns.keys())
      s.columns.set(o, i[r++]);
  }
), H = B(
  "thyseus::resizeTableLengths",
  (n) => (t) => {
    n.tableLengths = t;
  }
), It = B(
  "thyseus::resizeEntityLocations",
  (n) => (t) => {
    n.entities.setLocations(t);
  }
), xt = (n, t) => {
  for (const [e, i] of t) {
    const s = n.get(e);
    s === void 0 ? n.set(e, i) : s !== 0n && n.set(e, s | i);
  }
  return n;
}, J = St(
  ({ World: n }) => [n()],
  async function(t) {
    t.entities.isFull && t.entities.grow(t);
    const e = (await t.threads.send(Z())).reduce(
      xt,
      t.commands.queue
    );
    for (const [i, s] of e)
      t.moveEntity(i, s);
    e.clear(), t.entities.resetCursor();
  }
);
function Rt(n) {
  n.registerComponent(c), n.addSystem(J.afterAll()), n.registerThreadChannel(Z), n.registerThreadChannel(V), n.registerThreadChannel(G), n.registerThreadChannel(H);
}
function qt(n, t) {
  return n.parameters.some(
    (e) => t.parameters.some(
      (i) => e.intersectsWith(i) || i.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function X(n) {
  return n.map(
    (t) => n.reduce(
      (e, i, s) => e | BigInt(qt(t, i)) << BigInt(s),
      0n
    )
  );
}
function K(n, t) {
  const e = n.map(
    (s) => s.dependencies.reduce((r, o) => {
      const h = n.indexOf(o);
      return h === -1 ? r : r | 1n << BigInt(h);
    }, 0n)
  ), i = [...e];
  i.forEach(function s(r, o) {
    for (const h of y(r))
      s(i[h], h), i[o] |= i[h];
  }), I && i.forEach((s, r) => {
    p(
      (s & 1n << BigInt(r)) === 0n,
      `Circular Dependency Detected - Sytem #${r} (${n[r].fn.name}) depends on itself!`
    );
  });
  for (let s = 0; s < n.length; s++) {
    const r = n[s];
    if (r.isBeforeAll)
      for (const o of y(t[s]))
        o !== s && (i[s] & 1n << BigInt(o)) === 0n && (e[o] |= 1n << BigInt(s), i[o] |= 1n << BigInt(s));
    else if (r.isAfterAll)
      for (const o of y(t[s]))
        o !== s && (i[o] & 1n << BigInt(s)) === 0n && (e[s] |= 1n << BigInt(o), i[s] |= 1n << BigInt(o));
  }
  return e.forEach((s, r) => e[r] &= t[r]), e;
}
function Y(n, t, e) {
  for (const i of y(t))
    if (n[i] === e)
      return !1;
  return !0;
}
let Pt = 0;
const v = (...n) => {
};
class Ut {
  static fromWorld(t, e) {
    const i = t.threads.queue(
      () => X(e)
    ), s = t.threads.queue(
      () => K(e, i)
    ), r = t.threads.isMainThread ? e.map(() => !0) : e.map((a) => !a.parameters.some((u) => u.isLocalToThread())), o = t.threads.queue(
      () => t.createBuffer(8 + e.length * 3)
    ), h = t.threads.queue(
      () => `thyseus::ParallelExecutor${Pt++}`
    );
    return new this(
      t,
      new Uint32Array(o, 0, 2),
      new Uint8Array(o, 8),
      new Uint8Array(o, 8 + e.length),
      new Uint8Array(o, 8 + e.length * 2),
      i,
      s,
      r,
      h
    );
  }
  #t = v;
  #e = v;
  #s;
  #i;
  #n;
  #r;
  #o;
  #h;
  #c;
  #f;
  #u;
  #d;
  #a;
  #m;
  constructor(t, e, i, s, r, o, h, a, u) {
    this.#a = t.systems, this.#m = t.arguments, this.#d = t.threads.isMainThread, this.#h = o, this.#c = h, this.#o = a, this.#s = e, this.#i = i, this.#n = s, this.#r = r, this.#u = new BroadcastChannel(u), this.#f = u, this.#u.addEventListener(
      "message",
      ({ data: f }) => {
        f === 0 ? this.#g() : f === 1 ? (this.#t(), this.#t = v) : (this.#e(), this.#e = v);
      }
    );
  }
  async start() {
    return this.#l = this.#a.length, this.#i.fill(1), this.#r.fill(0), this.#n.fill(0), this.#p(), this.#g();
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
          (e, i) => !!e && Y(this.#r, this.#c[i], 0) && Y(this.#n, this.#h[i], 1) && this.#o[i]
        ), t !== -1 && (this.#i[t] = 0, this.#n[t] = 1, this.#l--);
      }), t === -1) {
        await this.#E();
        continue;
      }
      await this.#a[t](...this.#m[t]), await navigator.locks.request(this.#f, () => {
        this.#n[t] = 0, this.#r[t] = 1, Atomics.add(this.#s, 1, 1);
      }), this.#_();
    }
    this.#d && Atomics.load(this.#s, 1) !== this.#a.length && await this.#y();
  }
  #p() {
    this.#u.postMessage(0);
  }
  #_() {
    Atomics.load(this.#s, 1) === this.#a.length ? this.#u.postMessage(2) : this.#u.postMessage(1);
  }
  async #E() {
    return new Promise((t) => this.#t = t);
  }
  async #y() {
    return new Promise((t) => this.#e = t);
  }
}
class Wt {
  static fromWorld(t, e) {
    const i = K(
      e,
      X(e)
    ), s = i.reduce(function r(o, h, a) {
      for (const u of y(h))
        r(o, i[u], u);
      return o.includes(a) || o.push(a), o;
    }, []);
    return new this(t, s);
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
class Nt {
  systems = [];
  #t = [];
  components = /* @__PURE__ */ new Set();
  resources = /* @__PURE__ */ new Set();
  threadChannels = [];
  executor;
  config;
  url;
  constructor(t, e) {
    this.config = t, this.url = e, this.executor = t.threads > 1 ? Ut : Wt, Rt(this);
  }
  addSystem(t) {
    return this.systems.push(t), t.parameters.forEach((e) => e.onAddSystem(this)), this;
  }
  addStartupSystem(t) {
    return this.#t.push(t), t.parameters.forEach((e) => e.onAddSystem(this)), this;
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
    const t = T.spawn(this.config.threads - 1, this.url), e = await t.wrapInQueue(
      () => new kt(
        this.config,
        t,
        this.executor,
        [...this.components],
        [...this.resources],
        this.systems,
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
      for (const i of this.#t)
        await i.fn(...i.getArguments(e));
      await J.fn(e);
    }
    return e;
  }
}
class Ot {
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
    this.#i = new BigUint64Array(1), this.#s = new c(
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
    return this.#i[0] = t, this.insertInto(t, c), this.#s;
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
const Dt = (n = {}) => ({
  threads: 1,
  maxEntities: 2 ** 16,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...n
}), Yt = ({ threads: n, maxEntities: t }, e) => {
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
function Ft(n, t) {
  const e = Dt(n);
  return I && Yt(e, t), e;
}
const F = 64;
class kt {
  static new(t, e) {
    return new Nt(Ft(t, e), e);
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
  constructor(t, e, i, s, r, o, h) {
    this.#t = t.threads > 1 ? SharedArrayBuffer : ArrayBuffer, this.config = t, this.threads = e, this.tableLengths = this.threads.queue(
      () => new Uint32Array(
        this.createBuffer(
          F * Uint32Array.BYTES_PER_ELEMENT
        )
      )
    ), this.archetypeLookup.set(0n, 1);
    const a = C.create(this, [c], 0n, 1);
    a.columns.set(
      c,
      this.threads.queue(() => a.columns.get(c))
    ), this.archetypes.push(new Lt(this), a);
    for (const u of h)
      this.threads.setListener(
        u.channelName,
        u.onReceive(this)
      );
    this.components = s, this.entities = Mt.fromWorld(this), this.commands = Ot.fromWorld(this), this.executor = i.fromWorld(this, o);
    for (const u of r)
      if (k(u)) {
        const f = this.threads.queue(
          () => j(this, u, 1)
        );
        this.resources.set(
          u,
          new u(f, 0, this.commands)
        );
      } else
        e.isMainThread && this.resources.set(u, new u());
    for (const u of o)
      this.systems.push(u.fn), this.arguments.push(u.getArguments(this));
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
          s.length + F * Uint32Array.BYTES_PER_ELEMENT
        )
      ), this.tableLengths.set(s), this.threads.send(H(this.tableLengths));
    }
    const e = this.archetypes.length, i = C.create(
      this,
      [...y(t)].map((s) => this.components[s]),
      t,
      e
    );
    this.archetypeLookup.set(t, e), this.archetypes.push(i), this.threads.send(
      V(
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
      G(t.id, t.capacity, [...t.columns.values()])
    );
  }
}
function jt(n) {
  return n;
}
export {
  c as Entity,
  kt as World,
  J as applyCommands,
  B as createThreadChannel,
  jt as definePlugin,
  St as defineSystem,
  l as struct
};
