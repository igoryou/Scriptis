import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Real embedded PostgreSQL verification; not a cloud/Supabase test.
const pgModule = process.env.SCRIPTIS_PGLITE_MODULE || "@electric-sql/pglite";
async function database() {
  const { PGlite } = await import(pgModule!);
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users (id uuid primary key);
    insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  await db.exec(readFileSync(migration, "utf8"));
  return db;
}

const migration = new URL(
  "../../supabase/migrations/202609140001_integrations.sql",
  import.meta.url,
);

test("embedded PostgreSQL: paid quota is per authenticated user and fails closed after 30 requests", async () => {
  const db = await database();
  try {
    await db.exec(
      "set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);",
    );
    for (let i = 0; i < 30; i++)
      assert.equal(
        (await db.query("select public.consume_scriptis_quota() as allowed"))
          .rows[0].allowed,
        true,
      );
    assert.equal(
      (await db.query("select public.consume_scriptis_quota() as allowed"))
        .rows[0].allowed,
      false,
    );
    await db.exec(
      "select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);",
    );
    assert.equal(
      (await db.query("select public.consume_scriptis_quota() as allowed"))
        .rows[0].allowed,
      true,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select public.consume_scriptis_quota()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});

if (pgModule)
  test("embedded PostgreSQL: RLS isolates records and denies foreign-user upserts", async () => {
    const db = await database();
    try {
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
      insert into public.scriptis_history(id,user_id,record) values ('10000000-0000-4000-8000-000000000001',auth.uid(),'{"id":"10000000-0000-4000-8000-000000000001","createdAt":"2026-01-01T00:00:00.000Z"}');`);
      assert.equal(
        (await db.query("select * from public.scriptis_history")).rows.length,
        1,
      );
      await db.exec(
        `select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);`,
      );
      assert.equal(
        (await db.query("select * from public.scriptis_history")).rows.length,
        0,
      );
      await assert.rejects(
        db.exec(
          `insert into public.scriptis_history(id,user_id,record) values ('10000000-0000-4000-8000-000000000001',auth.uid(),'{"id":"10000000-0000-4000-8000-000000000001","createdAt":"2026-01-01T00:00:00.000Z"}') on conflict (id) do update set user_id=excluded.user_id,record=excluded.record;`,
        ),
        /row-level security/,
      );
      await db.exec("delete from public.scriptis_history");
      await db.exec(`reset role;`);
      assert.equal(
        (await db.query("select * from public.scriptis_history")).rows.length,
        1,
      );
      await db.exec("set role anon");
      await assert.rejects(
        db.query("select * from public.scriptis_history"),
        /permission denied/,
      );
    } finally {
      await db.close();
    }
  });

test("history migration grants only authenticated user-scoped RLS access", () => {
  const sql = readFileSync(migration, "utf8");
  assert.match(
    sql,
    /alter table public\.scriptis_history enable row level security/i,
  );
  assert.match(
    sql,
    /for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/i,
  );
  assert.match(
    sql,
    /for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/i,
  );
  assert.match(
    sql,
    /for update to authenticated[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/i,
  );
  assert.match(
    sql,
    /for delete to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/i,
  );
  assert.match(sql, /octet_length\(record::text\) <= 65536/i);
});
