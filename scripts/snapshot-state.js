// ════════════════════════════════════════════════════════════════════
// Snapshot de l'état Supabase — AVANT/Après déploiement Paul IA
// Usage: node snapshot-state.js <DB_URL> <output_file>
// ════════════════════════════════════════════════════════════════════
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const DB_URL = process.argv[2];
  const OUT = process.argv[3] || '/tmp/supabase-state.json';

  if (!DB_URL) { console.error('Usage: node snapshot-state.js <DB_URL> <out>'); process.exit(1); }

  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();

    const state = {
      snapshotAt: new Date().toISOString(),
      publicTables: {},
      functions: [],
      buckets: {},
      policies: [],
      storageFiles: {},
    };

    // Tables publiques + comptages
    const tables = await client.query(`
      SELECT c.relname AS name,
             c.reltuples::bigint AS est_rows,
             (SELECT count(*) FROM information_schema.columns col
              WHERE col.table_schema='public' AND col.table_name=c.relname) AS col_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'
      ORDER BY c.relname
    `);
    for (const t of tables.rows) {
      let exact = t.est_rows;
      try {
        const exactRes = await client.query(`SELECT count(*)::bigint AS n FROM "${t.name}"`);
        exact = exactRes.rows[0].n;
      } catch { /* keep estimate */ }
      state.publicTables[t.name] = { estimatedRows: Number(exact), columns: t.col_count };
    }

    // Fonctions publiques
    const funcs = await client.query(`
      SELECT p.proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname='public' ORDER BY p.proname
    `);
    state.functions = funcs.rows.map(r => r.proname);

    // Buckets
    const buckets = await client.query(`SELECT id, name, public, file_size_limit FROM storage.buckets ORDER BY id`);
    for (const b of buckets.rows) {
      const files = await client.query(`SELECT count(*)::bigint AS n FROM storage.objects WHERE bucket_id=$1`, [b.id]);
      state.buckets[b.id] = {
        public: b.public,
        sizeLimit: b.file_size_limit,
        fileCount: Number(files.rows[0].n),
      };
    }

    // Politiques RLS
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname FROM pg_policies
      WHERE schemaname IN ('public','storage')
      ORDER BY schemaname, tablename, policyname
    `);
    state.policies = policies.rows.map(r => `${r.schemaname}.${r.tablename}::${r.policyname}`);

    // Fichiers par bucket
    const objs = await client.query(`SELECT bucket_id, count(*)::bigint AS n FROM storage.objects GROUP BY bucket_id`);
    for (const o of objs.rows) state.storageFiles[o.bucket_id] = Number(o.n);

    fs.writeFileSync(OUT, JSON.stringify(state, null, 2));
    console.log(`✅ Snapshot: ${OUT}`);
    console.log(`   Tables publiques: ${Object.keys(state.publicTables).length}`);
    console.log(`   Buckets: ${Object.keys(state.buckets).length}`);
    console.log(`   Politiques RLS: ${state.policies.length}`);
    for (const [name, info] of Object.entries(state.publicTables)) {
      console.log(`   • ${name}: ${info.estimatedRows} lignes`);
    }
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });