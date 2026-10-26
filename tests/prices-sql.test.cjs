const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');
const sql = fs.readFileSync('supabase-prices.sql', 'utf8');
const keys = [...fs.readFileSync('admin.html','utf8').matchAll(/id="(price\w+)" value="([\d.]+)"/g)].map(m=>m[1]);
const admin = '00000000-0000-0000-0000-000000000001';
async function fixture() {
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key, email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 grant usage on schema public, auth to anon, authenticated;
 grant execute on function auth.uid() to anon, authenticated;
 insert into auth.users values ('${admin}', 'kamlin.eg2025@gmail.com');`);
 return db;
}
async function as(db, role, id, fn) {
 await db.exec('begin');
 try {
  await db.exec(`set local role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id || '']);
  return await fn();
 } finally { await db.exec('rollback'); }
}
test('migration executes, re-applies, enforces payload and actual RLS', async()=>{
 const db = await fixture();
 try {
  await db.exec(sql); await db.exec(sql);
  const payload = Object.fromEntries(keys.map(k=>[k,100])); payload.priceSofa=0; payload.priceRegular=1234.5;
  // Insert and update exercise the two independent admin policies.
  await db.exec('begin; set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, true)",[admin]);
  await db.query("insert into public.site_settings(key,value) values ('prices',$1)",[JSON.stringify(payload)]);
  await db.query("update public.site_settings set value=$1, updated_at='2000-01-01' where key='prices'",[JSON.stringify(payload)]);
  await db.exec('commit');
  const row=(await db.query("select * from site_settings where key='prices'")).rows[0];
  assert.deepEqual(row.value,payload); assert.ok(new Date(row.updated_at).getFullYear()>2000);
  await db.exec("insert into site_settings(key,value) values ('private','{}')");
  for(const [role,id] of [['anon',''],['authenticated','00000000-0000-0000-0000-000000000002']]) {
   await as(db,role,id,async()=>assert.equal((await db.query('select * from site_settings')).rows.length,1));
   await as(db,role,id,async()=>assert.equal((await db.query("update site_settings set value=value where key='prices' returning key")).rows.length,0)).catch(e=>{if(role!=='anon')throw e; assert.equal(e.code,'42501');});
   await assert.rejects(as(db,role,id,()=>db.query("insert into site_settings(key,value) values ('other','{}')")));
   await assert.rejects(as(db,role,id,()=>db.query('delete from site_settings')));
  }
  for(const invalid of [{}, {...payload,priceRegular:-1}, {...payload,priceRegular:'100'}, {...payload,priceRegular:1.234}, {...payload,secret:'x'}]) {
   await assert.rejects(as(db,'authenticated',admin,()=>db.query("update site_settings set value=$1 where key='prices'",[JSON.stringify(invalid)])), e=>e.code==='23514');
  }
  await assert.rejects(as(db,'authenticated',admin,()=>db.query("insert into site_settings(key,value) values ('other','{}')")));
 } finally { await db.close(); }
});
test('missing admin or unknown existing policies abort migration',async()=>{
 const db=await fixture();
 try {
  await db.exec('delete from auth.users');
  await assert.rejects(db.exec(sql)); await db.exec('rollback');
  assert.equal((await db.query("select to_regclass('public.site_settings') as t")).rows[0].t,null);
  await db.exec(`insert into auth.users values ('${admin}','kamlin.eg2025@gmail.com')`);
  await db.exec(sql);
  await db.exec('create policy unexpected_policy on site_settings for select using (true)');
  await assert.rejects(db.exec(sql), /policies need review/); await db.exec('rollback');
 } finally {await db.close();}
});
