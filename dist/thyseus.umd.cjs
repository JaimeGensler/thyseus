(function(d,m){typeof exports=="object"&&typeof module<"u"?m(exports):typeof define=="function"&&define.amd?define(["exports"],m):(d=typeof globalThis<"u"?globalThis:d||self,m(d.Thyseus={}))})(this,function(d){"use strict";var m=(s,t,e)=>{if(!t.has(s))throw TypeError("Cannot "+e)},v=(s,t,e)=>(m(s,t,"read from private field"),e?e.call(s):t.get(s)),G=(s,t,e)=>{if(t.has(s))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(s):t.set(s,e)},H=(s,t,e,i)=>(m(s,t,"write to private field"),i?i.call(s,e):t.set(s,e),e),S;const R="@IS_SENT_BY_THREAD",M=class extends Worker{constructor(s,t){super(s,{type:"module"}),G(this,S,[]),H(this,S,t)}static send(s){return globalThis.postMessage(b(s,this.globalSendableTypes)),this}static receive(s=3e3){return new Promise((t,e)=>{let i=setTimeout(()=>{e("Timed out."),globalThis.removeEventListener("message",n)},s);const n=r=>{clearTimeout(i),t(A(r.data,this.globalSendableTypes)),globalThis.removeEventListener("message",n)};globalThis.addEventListener("message",n)})}static isSendableClass(s){return typeof s=="function"&&M.Receive in s&&M.Send in s.prototype}send(s){return super.postMessage(b(s,v(this,S))),this}receive(s=3e3){return new Promise((t,e)=>{let i=setTimeout(()=>{e("Timed out."),this.removeEventListener("message",n)},s);const n=r=>{clearTimeout(i),t(A(r.data,v(this,S))),this.removeEventListener("message",n)};this.addEventListener("message",n)})}};let c=M;S=new WeakMap,c.Send=Symbol(),c.Receive=Symbol(),c.globalSendableTypes=[];function K(s){return c.Send in s}function V(s){return R in s}function b(s,t){if(typeof s!="object"||s===null)return s;if(K(s))return{[R]:[t.indexOf(Object.getPrototypeOf(s).constructor),b(s[c.Send](),t)]};for(const e in s)s[e]=b(s[e],t);return s}function A(s,t){if(typeof s!="object"||s===null)return s;if(V(s)){const[e,i]=s[R],n=A(i,t);return t[e][c.Receive](n)}for(const e in s)s[e]=A(s[e],t);return s}const T=0b11111111n;class C{#t;#e;get bytesPerElement(){return this.#e}get byteLength(){return this.#t.byteLength}static with(t,e,i=!1){const n=i?SharedArrayBuffer:ArrayBuffer;return new this(t,e,new Uint8Array(new n(Math.ceil(t/8)*e)))}constructor(t,e,i){this.width=t,this.length=e,this.#t=i,this.#e=Math.ceil(this.width/8)}get(t){let e=0n;const i=this.#e*t;for(let n=0;n<this.#e;n++)e|=BigInt(this.#t[i+n])<<BigInt(n*8);return e}set(t,e){const i=this.#e*t;for(let n=0;n<this.#e;n++)this.#t[i+n]=Number(e>>BigInt(n*8)&T)}orEquals(t,e){const i=this.#e*t;for(let n=0;n<this.#e;n++)this.#t[i+n]|=Number(e>>BigInt(n*8)&T)}andEquals(t,e){const i=this.#e*t;for(let n=0;n<this.#e;n++)this.#t[i+n]&=Number(e>>BigInt(n*8)&T)}xorEquals(t,e){const i=this.#e*t;for(let n=0;n<this.#e;n++)this.#t[i+n]^=Number(e>>BigInt(n*8)&T)}[c.Send](){return[this.width,this.length,this.#t]}static[c.Receive]([t,e,i]){return new this(t,e,i)}}function p(s,t,e=Error){if(!s)throw new e(t)}class D{#t;#e;constructor(t,e=new Int32Array(new SharedArrayBuffer(4))){this.#t=t,this.#e=e}get isLocked(){return this.#e[0]===1}UNSAFE_getData(){return this.#t}async request(t){await this.#i();const e=await t(this.#t);return this.#s(),e}async#i(){for(;;){if(Atomics.compareExchange(this.#e,0,0,1)===0)return;await Atomics.waitAsync(this.#e,0,1).value}}#s(){const t=Atomics.compareExchange(this.#e,0,1,0);Atomics.notify(this.#e,0),p(t===1,"Tried to unlock a mutex that was not locked.")}[c.Send](){return[this.#t,this.#e]}static[c.Receive]([t,e]){return new this(t,e)}}class _{#t;static with(t,e=!1){const i=e?SharedArrayBuffer:ArrayBuffer;return new this(new Uint32Array(new i(t*4)),new Uint32Array(new i(t*4)),new Uint32Array(new i(4)))}constructor(t,e,i){this.sparse=t,this.dense=e,this.#t=i}get size(){return this.#t[0]}set size(t){this.#t[0]=t}has(t){return this.dense[this.sparse[t]]===t&&this.sparse[t]<this.size}add(t){if(this.has(t))return this;if(this.sparse.length<=t)throw new RangeError("Invalid index");return this.sparse[t]=this.size,this.dense[this.size]=t,this.size++,this}delete(t){if(!this.has(t))return!1;this.size--;const e=this.sparse[t];return this.dense[e]=this.dense[this.size],this.sparse[this.dense[e]]=e,!0}clear(){this.size=0}*[Symbol.iterator](){const t=this.size;for(let e=0;e<t;e++)yield this.dense[e]}[c.Send](){return[this.sparse,this.dense,this.#t]}static[c.Receive]([t,e,i]){return new this(t,e,i)}}class x{static from(t,e){return new this(t,e,_.with(t.length,!0),new D(C.with(t.length,2,!0)))}#t;#e;#i;#s;#n;constructor(t,e,i,n){this.#e=t,this.#i=e,this.#s=i,this.#n=n,this.#t=new Int32Array(i[c.Send]()[2].buffer)}add(t){this.#s.add(t)}start(){Atomics.notify(this.#t,0)}reset(){const t=this.#n.UNSAFE_getData();t.set(0,0n),t.set(1,0n)}async onReady(t){const{async:e,value:i}=Atomics.waitAsync(this.#t,0,0);if(!e)throw new Error("Trying to wait while there are still systems to execute");await i,t()}async*iter(t){for(;this.#s.size+t.size>0;){const e=this.#s.size;let i=-1;await this.#n.request(n=>{const r=n.get(0),o=n.get(1);for(const h of[...t,...this.#s])if((r&this.#e[h])===0n&&(o&this.#i[h])===this.#i[h]){i=h,this.#s.delete(h),t.delete(h),n.orEquals(0,1n<<BigInt(h));break}}),i>-1?(yield i,await this.#n.request(n=>{n.xorEquals(0,1n<<BigInt(i)),n.orEquals(1,1n<<BigInt(i)),(this.#t[0]!==0||this.#t[0]===0&&n.get(0)===0n)&&Atomics.notify(this.#t,0)})):e!==0&&await Atomics.waitAsync(this.#t,0,e).value}}[c.Send](){return[this.#e,this.#i,this.#s,this.#n]}static[c.Receive](t){return new this(...t)}}const J=()=>{};class X{#t=J;#e;constructor(t){this.#e=t,this.#t}add(){}reset(){}start(){this.#t(0)}async onReady(t){await new Promise(e=>{this.#t=e}),t()}async*iter(){for(const t of this.#e)yield t}}function Z(s,t){return s.parameters.some(e=>t.find(i=>i.type===e.type).isLocalToThread(e))}const tt=[_,D,C,x];function L(s){const t=[...tt];for(const e of s)t.push(...e.extendSendable?.()??[]);return t}var l=(s=>(s[s.Disjoint=0]="Disjoint",s[s.Intersecting=1]="Intersecting",s))(l||{});class et{#t=0;#e=[];#i=[];#s=new Set;#n;#r;#o;constructor(t,e,i){this.#n=t,this.#r=e,this.#o=i}updateQueries(){for(const t of this.#s)for(const e of this.#o)e.testAdd(t,this.#i[t]);this.#s.clear()}spawn(...t){const e=this.#e.pop()??this.#t++;return this.#i[e]=0n,this.insert(e,...t),e}despawn(t){this.#e.push(t),this.#s.add(t),this.#i[t]=0n}insert(t,...e){for(const i of e)this.#s.add(t),this.#i[t]|=1n<<BigInt(this.#r.indexOf(i))}remove(t,...e){for(const i of e)this.#s.add(t),this.#i[t]&=~(1n<<BigInt(this.#r.findIndex(i)))}}function st(s,t){return it(s,t)}const it=(s,t)=>t.reduce((e,i)=>e|1n<<BigInt(s.indexOf(i)),0n);function B(s){return[s,1]}function nt(s){return Array.isArray(s)&&s.length===2&&typeof s[0]=="function"&&s[1]===1}B.is=nt;function y(s){if(!s)return z;class t{constructor(i,n){this.$=i,this._=n}}t.schema=s;for(const e in s){const i=Array.isArray(s)?Number(e):e;Object.defineProperty(t.prototype,i,{enumerable:!0,get(){return this.$[i][this._]},set(n){this.$[i][this._]=n}})}return t}function rt(s){return typeof s=="function"&&"schema"in s}y.is=rt;class z{constructor(t,e){throw new Error("Tried to construct a Tag Component!")}}z.schema={};var k=(s=>(s[s.u8=0]="u8",s[s.u16=1]="u16",s[s.u32=2]="u32",s[s.u64=3]="u64",s[s.i8=4]="i8",s[s.i16=5]="i16",s[s.i32=6]="i32",s[s.i64=7]="i64",s[s.f32=8]="f32",s[s.f64=9]="f64",s))(k||{});const q={[0]:1,[1]:2,[2]:4,[3]:8,[4]:1,[5]:2,[6]:4,[7]:8,[8]:4,[9]:8},ot={[0]:Uint8Array,[1]:Uint16Array,[2]:Uint32Array,[3]:BigUint64Array,[4]:Int8Array,[5]:Int16Array,[6]:Int32Array,[7]:BigInt64Array,[8]:Float32Array,[9]:Float64Array};function O(s,{maxCount:t,isShared:e}){const i=P(s.schema),n=new(e?SharedArrayBuffer:ArrayBuffer)(i*t);return U(s.schema,n,[0],t)}const P=s=>(Array.isArray(s)?s:Object.values(s)).reduce((t,e)=>t+(typeof e=="number"?q[e]:P(e.schema)),0),U=(s,t,e,i)=>{const n=Array.isArray(s);return Object.entries(s).reduce((r,[o,h],a)=>{const f=n?a:o;return typeof h=="number"?(r[f]=new ot[h](t,e[0],i),e[0]+=i*q[h]):r[f]=U(h.schema,t,e,i),r},n?[]:{})};class at{#t;#e;#i;#s;constructor(t,e,i,n){this.entities=i,this.#e=t,this.#i=e,this.#t=this.#e.map((r,o)=>new r(this.#i[o],0)),this.#s=n}*[Symbol.iterator](){for(const t of this.entities){for(const e of this.#t)e.eid=t;yield this.#t}}testAdd(t,e){this.#n(e)&&this.entities.add(t)}#n(t){return(t&this.#s)===this.#s}}var u=(s=>(s[s.Read=0]="Read",s[s.Write=1]="Write",s))(u||{});const W=Symbol();class w{constructor(t){this.queries=[],this.components=[],this.stores=[],this.#t=[],this.#e=0,this.#i=0,this.#s=t}get type(){return W}#t;#e;#i;#s;onAddSystem({data:t}){this.#e++;for(const e of t.components)this.components.includes(e)||this.components.push(e)}onBuildMainWorld(){for(const t of this.components)this.stores.push(O(t,{maxCount:this.#s.maxEntities,isShared:this.#s.threads>1}));this.#t=Array.from({length:this.#e},()=>_.with(256,this.#s.threads>1))}onBuildSystem({data:t}){const e=new at(t.components,this.stores.filter((i,n)=>t.components.includes(this.components[n])),this.#t[this.#i++],st(this.components,t.components));return this.queries.push(e),e}sendToThread(){return[this.#t,this.stores]}receiveOnThread([t,e]){this.#t=t,this.stores=e}isLocalToThread(){return!1}getRelationship(t,e){const i=new Set,n=new Set;for(let r=0;r<t.data.components.length;r++){const o=t.data.components[r];(t.data.accessType[r]===u.Read?i:n).add(o)}for(let r=0;r<e.data.components.length;r++){const o=e.data.components[r],h=e.data.accessType[r];if(h===u.Read&&n.has(o)||h===u.Write&&(i.has(o)||n.has(o)))return l.Intersecting}return l.Disjoint}static createDescriptor(t){return{type:W,data:t.reduce((e,i)=>{const n=B.is(i);return e.components.push(n?i[0]:i),e.accessType.push(n?u.Write:u.Read),e},{components:[],accessType:[]})}}}const $=Symbol();class g{constructor(t){this.entityManager=null,this.#t=t}get type(){return $}#t;onBuildMainWorld(t){const e=t.find(i=>i instanceof w);this.entityManager=new et(e.stores,e.components,e.queries)}onBuildSystem(){return this.entityManager}isLocalToThread(){return!0}getRelationship(t,e){return l.Intersecting}static createDescriptor(){return ht}}const ht={type:$,data:null},N=Symbol();class E{get type(){return N}#t=new Map;#e=0;#i=[];#s=[];#n=[];#r=[];#o;constructor(t){this.#o=t}onBuildMainWorld(){this.#i=this.#s.map(t=>O(t,{maxCount:1,isShared:this.#o.threads>1})),this.#r=this.#n.map(t=>new t)}onAddSystem({data:{resource:t}}){y.is(t)?this.#s.push(t):c.isSendableClass(t)&&this.#n.push(t)}extendSendable(){return this.#n}sendToThread(){return[this.#i,this.#r]}receiveOnThread([t,e]){this.#i=t;for(const i of e)this.#t.set(i.constructor,i)}onBuildSystem({data:{resource:t}}){if(!globalThis.document&&!(y.is(t)||c.isSendableClass(t)))return null;if(!this.#t.has(t)){const e=y.is(t)?[this.#i[this.#e++],0]:[this.#o];this.#t.set(t,ct(t)?t.create(...e):new t(...e))}return this.#t.get(t)}isLocalToThread({data:{resource:t}}){return!(y.is(t)||c.isSendableClass(t))}getRelationship(t,e){return t.data.resource!==e.data.resource||t.data.accessType===u.Read&&e.data.accessType===u.Read?l.Disjoint:l.Intersecting}static createDescriptor(t){const e=B.is(t);return{type:N,data:{resource:e?t[0]:t,accessType:e?u.Write:u.Read}}}}function ct(s){return"create"in s}const dt={Entities:g.createDescriptor,Query:w.createDescriptor,Res:E.createDescriptor};function ut(s,t){return{fn:t,parameters:s}}function ft(s,t,e){const i=Array.from({length:s.length},()=>0n),n=(r,o)=>(i[r]&1n<<BigInt(o))!==0n;return t.forEach((r,o)=>{if(!!r){for(const h of r.before??[]){const a=s.indexOf(h);a!==-1&&(p(!n(o,a),`Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[a].fn.name} (${a}) depend on each other.`),i[a]|=1n<<BigInt(o))}for(const h of r.after??[]){const a=s.indexOf(h);a!==-1&&(p(!n(a,o),`Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[a].fn.name} (${a}) depend on each other.`),i[o]|=1n<<BigInt(a))}}}),i.forEach((r,o)=>{p(!n(o,o),`Circular dependency detected: ${s[o].fn.name} (${o}) and ${s[o].fn.name} (${o}) depend on each other.`)}),t.forEach((r,o)=>{if(!!r){if(r.beforeAll)for(const h of j(e[o]))h!==o&&(i[o]&1n<<BigInt(h))===0n&&(i[h]|=1n<<BigInt(o));if(r.afterAll)for(const h of j(e[o]))h!==o&&(i[h]&1n<<BigInt(o))===0n&&(i[o]|=1n<<BigInt(h))}}),i.forEach((r,o)=>i[o]&=e[o]),i}function*j(s){let t=0;for(;s!==0n;)(s&1n)===1n&&(yield t),s>>=1n,t++}function lt(s,t,e){for(const i of s.parameters)for(const n of t.parameters)if(i.type===n.type&&e.find(r=>r.type===i.type)?.getRelationship(i,n)===l.Intersecting)return l.Intersecting;return l.Disjoint}function pt(s,t){return s.map(e=>s.reduce((i,n,r)=>i|BigInt(lt(e,n,t))<<BigInt(r),0n))}const mt={threads:1,maxEntities:2**16};function F({threads:s,maxEntities:t},e){s>1&&(p(isSecureContext&&typeof SharedArrayBuffer<"u","Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer, which requires a secure context."),p(e,"Invalid config - Multithreading (threads > 1) requires a module URL parameter.")),p(s>0&&Number.isSafeInteger(s),"Invalid config - 'threads' must be a safe, positive integer (min 1)."),p(t>0&&Number.isSafeInteger(t),"Invalid config - 'maxEntities' must be a safe, positive integer.")}class yt{#t=[];#e=[];#i=[];#s;#n=[];#r;#o;constructor(t,e){F(t,e),this.#r=t,this.#o=e,this.#s=[new w(t),new E(t),new g(t)]}addSystem(t,e){return this.#e.push(t),this.#t.push(e),this.#a(t),this}addStartupSystem(t){return this.#i.push(t),this.#a(t),this}async build(){for(const a of this.#s)a.onBuildMainWorld?.(this.#s.filter(f=>f!==a));const t=this.#e.map(a=>this.#h(a)),e=this.#i.map(a=>this.#h(a)),i=pt(this.#e,this.#s),n=ft(this.#e,this.#t,i),r=x.from(i,n),o=L(this.#s);if(this.#r.threads>1)for(let a=1;a<this.#r.threads;a++){const f=new c(this.#o,o);for(const Y of this.#s)Y.sendToThread&&this.#n.push(f.send(Y.sendToThread()));f.send(r),this.#n.push(f)}await Promise.all(this.#n.map(a=>a.receive()));for(const{execute:a,args:f}of e)a(...f);const h=new Set;for(let a=0;a<this.#e.length;a++)Z(this.#e[a],this.#s)&&h.add(a);return new I(t,this.#s.find(a=>a instanceof g).entityManager,this.#n,r,h)}#a(t){for(const e of t.parameters)for(const i of this.#s)if(i.type===e.type){i.onAddSystem?.(e);break}}#h({fn:t,parameters:e}){return{execute:t,args:e.map(i=>{const n=this.#s.find(r=>r.type===i.type);if(!n)throw new Error("Unrecognized parameter.");return n.onBuildSystem(i)})}}}class gt{#t=[];#e=[];#i;#s;constructor(t){F(t,void 0),this.#s=t,this.#i=[new w(t),new E(t),new g(t)]}addSystem(t){return this.#t.push(t),this.#n(t),this}addStartupSystem(t){return this.#e.push(t),this.#n(t),this}async build(){for(const n of this.#i)n.onBuildMainWorld?.(this.#i.filter(r=>r!==n));const t=this.#t.map(n=>this.#r(n)),e=this.#e.map(n=>this.#r(n)),i=new X(Array.from({length:t.length},(n,r)=>r));for(const{execute:n,args:r}of e)n(...r);return new I(t,this.#i.find(n=>n instanceof g).entityManager,[],i,new Set)}#n(t){for(const e of t.parameters)for(const i of this.#i)if(i.type===e.type){i.onAddSystem?.(e);break}}#r({fn:t,parameters:e}){return{execute:t,args:e.map(i=>{const n=this.#i.find(r=>r.type===i.type);if(!n)throw new Error("Unrecognized parameter.");return n.onBuildSystem(i)})}}}class St{#t=[];#e;#i;constructor(t){this.#i=t,this.#e=[new w(t),new E(t),new g(t)]}addSystem(t){return this.#t.push(t),this.#s(t),this}addStartupSystem(t){return this.#s(t),this}async build(){c.globalSendableTypes=L(this.#e);for(const n of this.#e)n.receiveOnThread&&n.receiveOnThread(await c.receive());const t=await c.receive(),e=this.#t.map(n=>this.#n(n)),i=new I(e,{},[],t,new Set);return c.send(0),i}#s(t){for(const e of t.parameters)for(const i of this.#e)if(i.type===e.type){i.onAddSystem?.(e);break}}#n({fn:t,parameters:e}){return{execute:t,args:e.map(i=>{const n=this.#e.find(r=>r.type===i.type);if(!n)throw new Error("Unrecognized parameter.");return n.onBuildSystem(i)})}}}const Q=!!globalThis.document;class I{static new(t={},e){const i=t.threads&&t.threads>1?Q?yt:St:gt;return new i({...mt,...t},e)}#t=new Set;#e;#i;#s;#n;#r;constructor(t,e,i,n,r){this.#e=t,this.#i=e,this.#s=i,this.#n=n,this.#r=r,Q&&this.#i.updateQueries(),this.#n.onReady(()=>this.#o())}async update(){this.#n.reset();for(let t=0;t<this.#e.length;t++)this.#r.has(t)?this.#t.add(t):this.#n.add(t);this.#n.start()}async#o(){for await(const t of this.#n.iter(this.#t)){const e=this.#e[t];e.execute(...e.args)}this.#n.onReady(()=>this.#o())}}d.Component=y,d.Mut=B,d.P=dt,d.Thread=c,d.Type=k,d.default=I,d.defineSystem=ut,Object.defineProperties(d,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}})});
