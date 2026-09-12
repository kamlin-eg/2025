const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = __dirname;
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const fields = [...adminHtml.matchAll(/id="(price\w+)" value="([\d.]+)"/g)].map(m => [m[1], m[2]]);
const email = 'kamlin.eg2025@gmail.com';
function fixture(kind, db = {value: null}) {
  const elements = new Map();
  const writes = [], alerts = [], requests = [];
  const state = {session: null, readError: null, writeError: null};
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', defaultValue: '', style: {}, dataset: {}, textContent: '', innerHTML: '',
      disabled: false, classList: {add(){}, remove(){}, toggle(){}},
      addEventListener(name, fn) {this[name] = fn;},
      querySelector(){return element(id + '-button');}, checkValidity(){return true;}, focus(){},
    });
    return elements.get(id);
  }
  fields.forEach(([id, value]) => Object.assign(element(id), {value, defaultValue: value}));
  const priceNodes = fields.map(([id]) => ({dataset: {price: id}, textContent: ''}));
  const client = {
    auth: {
      async getSession(){return {data: {session: state.session}, error: null};},
      onAuthStateChange(){},
      async signInWithPassword(){state.session = {user: {email}}; return {data: {session: state.session}, error: null};},
      async signOut(){state.session = null; return {error: null};},
    },
    from(table) {
      const query = {table};
      requests.push(query);
      return {
        select(columns){query.columns = columns; return this;},
        eq(key, value){query.filter = [key, value]; return this;},
        abortSignal(){return this;},
        async maybeSingle(){return {data: db.value ? {value: structuredClone(db.value)} : null, error: state.readError};},
        upsert(row, options){query.row = row; query.options = options; return this;},
        async single(){
          if (state.writeError) return {data: null, error: state.writeError};
          db.value = structuredClone(query.row.value);
          return {data: {value: structuredClone(db.value)}, error: null};
        },
      };
    },
  };
  const context = vm.createContext({
    console: {error(){}}, Intl, Date, Number, String, Object, Array, AbortSignal,
    document: {
      hidden: false, getElementById: element,
      querySelector: element,
      querySelectorAll: selector => selector === '[data-price]' ? priceNodes : [],
      addEventListener(){},
    },
    window: {supabase: {createClient: () => client}, addEventListener(){}, location: {reload(){}}},
    localStorage: {getItem(){return null;}, setItem(...args){writes.push(args);}, removeItem(){}},
    alert: message => alerts.push(message), setInterval(){}, setTimeout(){},
  });
  vm.runInContext(fs.readFileSync(path.join(root, kind + '.js'), 'utf8'), context);
  return {context, state, element, priceNodes, writes, alerts, requests, db};
}
test('every admin price has exactly one public display', () => {
  assert.equal(fields.length, 23);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/data-price="(price\w+)"/g)].map(m => m[1]);
  assert.deepEqual(ids.sort(), fields.map(([id]) => id).sort());
});
test('opening the admin does not save locally or announce success', async () => {
  const f = fixture('admin');
  await new Promise(setImmediate);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.alerts, []);
  assert.equal(f.requests.length, 0);
  assert.equal(f.element('adminLogin').style.display, 'flex');
});
test('password login and restored session use Supabase authentication', async () => {
  const f = fixture('admin');
  await f.element('adminLoginForm').onsubmit({preventDefault(){}});
  await new Promise(setImmediate);
  assert.equal(f.element('adminLogin').style.display, 'none');
  assert.equal(f.element('adminPassword').value, '');
  assert.equal(f.element('savePricesBtn').disabled, false);
  await vm.runInContext('initAdminLogin()', f.context);
  assert.equal(f.element('adminLogin').style.display, 'none');
});
test('missing table blocks saving and retry recovers', async () => {
  const f = fixture('admin');
  f.state.readError = {code: 'PGRST205'};
  await vm.runInContext('loadPrices()', f.context);
  assert.equal(f.element('savePricesBtn').disabled, true);
  await vm.runInContext('savePrices()', f.context);
  assert.equal(f.requests.filter(r => r.row).length, 0);
  f.state.readError = null;
  await vm.runInContext('loadPrices()', f.context);
  assert.equal(f.element('savePricesBtn').disabled, false);
});
test('invalid prices and unsigned sessions cannot publish', async () => {
  const f = fixture('admin');
  await vm.runInContext('loadPrices()', f.context);
  for (const value of ['', '-1', 'Infinity', 'invalid']) {
    f.element('priceRegular').value = value;
    await vm.runInContext('savePrices()', f.context);
  }
  f.element('priceRegular').value = '100';
  await vm.runInContext('savePrices()', f.context);
  assert.equal(f.requests.filter(r => r.row).length, 0);
});
test('RLS/write failures never report success', async () => {
  const f = fixture('admin');
  f.state.session = {user: {email}};
  await vm.runInContext('loadPrices()', f.context);
  f.state.writeError = {code: '42501'};
  await vm.runInContext('savePrices()', f.context);
  assert.match(f.element('pricesStatus').textContent, /لم يتم تأكيد/);
  assert.equal(f.db.value, null);
  assert.equal(f.element('savePricesBtn').disabled, false);
});
test('saved prices appear on another device, including zero and decimals', async () => {
  const db = {value: null};
  const admin = fixture('admin', db);
  admin.state.session = {user: {email}};
  await vm.runInContext('loadPrices()', admin.context);
  admin.element('priceRegular').value = '1234.5';
  admin.element('priceSofa').value = '0';
  await vm.runInContext('savePrices()', admin.context);
  assert.equal(db.value.priceRegular, 1234.5);
  assert.equal(db.value.priceSofa, 0);
  assert.equal(Object.keys(db.value).length, 23);
  assert.match(admin.element('pricesStatus').textContent, /بنجاح/);
  const publicSite = fixture('app', db);
  await new Promise(setImmediate);
  assert.equal(publicSite.priceNodes[0].textContent, new Intl.NumberFormat('ar-EG').format(1234.5) + ' ج.م');
  assert.equal(publicSite.priceNodes[6].textContent, '٠ ج.م');
  db.value.priceRegular = 222;
  await vm.runInContext('refreshPublicPrices()', publicSite.context);
  assert.equal(publicSite.priceNodes[0].textContent, '٢٢٢ ج.م');
  assert.deepEqual(publicSite.writes, []);
});
test('public failures remove stale prices; missing or malformed values are not zero', async () => {
  const f = fixture('app', {value: {priceRegular: 100, priceSofa: '', priceDeep: null, priceVillas: true}});
  await new Promise(setImmediate);
  assert.equal(f.priceNodes[0].textContent, '١٠٠ ج.م');
  for (const i of [1,3,6]) assert.match(f.priceNodes[i].textContent, /تواصل/);
  f.state.readError = {message: 'offline'};
  await vm.runInContext('refreshPublicPrices()', f.context);
  assert.ok(f.priceNodes.every(n => /تواصل/.test(n.textContent)));
});

