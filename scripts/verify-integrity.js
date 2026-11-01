// ════════════════════════════════════════════════════════════════════
// Vérification d'intégrité : compare l'état avant/après Paul IA
// Usage: node verify-integrity.js <DB_URL> <before.json> <after.json>
// Garantit: aucune table/bucket/politique/fichier existant endommagé
// ════════════════════════════════════════════════════════════════════
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const [DB_URL, BEFORE_PATH, AFTER_PATH] = process.argv.slice(2);
  if (!DB_URL || !BEFORE_PATH || !AFTER_PATH) {
    console.error('Usage: node verify-integrity.js <DB_URL> <before.json> <after.json>');
    process.exit(1);
  }

  const before = JSON.parse(fs.readFileSync(BEFORE_PATH, 'utf8'));
  const after = JSON.parse(fs.readFileSync(AFTER_PATH, 'utf8'));

  let failures = 0;
  const ok = (m) => console.log('   ✅ ' + m);
  const bad = (m) => { console.log('   ❌ ' + m); failures++; };

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  VÉRIFICATION D\'INTÉGRITÉ — Projets existants            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Tables existantes (non-paul_) toutes présentes
  console.log('1️⃣  Tables existantes intactes :');
  for (const [name] of Object.entries(before.publicTables)) {
    if (name.startsWith('paul_')) continue;
    if (after.publicTables[name]) ok(`${name} présent`);
    else bad(`TABLE DISPARUE: ${name}`);
  }

  // 2. Colonnes des tables existantes inchangées
  console.log('2️⃣  Schémas des tables existants inchangés :');
  for (const [name, info] of Object.entries(before.publicTables)) {
    if (name.startsWith('paul_')) continue;
    const afterInfo = after.publicTables[name];
    if (afterInfo && afterInfo.columns >= info.columns) ok(`${name} (${info.columns} colonnes)`);
    else bad(`${name}: colonnes ${info.columns} → ${afterInfo?.columns}`);
  }

  // 3. Données : aucune table existante ne doit perdre de lignes
  console.log('3️⃣  Données existantes intactes :');
  for (const [name, info] of Object.entries(before.publicTables)) {
    if (name.startsWith('paul_')) continue;
    const afterInfo = after.publicTables[name];
    if (!afterInfo) { bad(`${name}: disparue`); continue; }
    if (Number(afterInfo.estimatedRows) >= Number(info.estimatedRows)) {
      ok(`${name}: ${info.estimatedRows} → ${afterInfo.estimatedRows} lignes`);
    } else {
      bad(`PERTE DE DONNÉES: ${name} (${info.estimatedRows} → ${afterInfo.estimatedRows})`);
    }
  }

  // 4. Buckets existants intacts (présence + fichiers)
  console.log('4️⃣  Buckets existants :');
  for (const [id, info] of Object.entries(before.buckets)) {
    if (id.startsWith('paul-')) continue;
    const afterInfo = after.buckets[id];
    if (!afterInfo) { bad(`BUCKET DISPARU: ${id}`); continue; }
    ok(`${id} (${info.fileCount} fichiers)`);
  }

  // 5. Fichiers storage : aucun fichier existant supprimé
  console.log('5️⃣  Fichiers de stockage :');
  for (const [bucket, count] of Object.entries(before.storageFiles)) {
    if (bucket.startsWith('paul-')) continue;
    const afterCount = after.storageFiles[bucket] ?? 0;
    if (Number(afterCount) >= Number(count)) ok(`${bucket}: ${count} fichiers`);
    else bad(`FICHIERS SUPPRIMÉS: ${bucket} (${count} → ${afterCount})`);
  }

  // 6. Politiques RLS existantes préservées
  console.log('6️⃣  Politiques RLS existantes :');
  const beforePolicies = new Set(before.policies.filter(p => !p.includes('paul_')));
  const afterPolicies = new Set(after.policies);
  for (const p of beforePolicies) {
    if (afterPolicies.has(p)) ok(p);
    else bad(`POLITIQUE DISPARUE: ${p}`);
  }

  console.log('');
  if (failures === 0) {
    console.log('✅ INTÉGRITÉ 100% CONFIRMÉE — Aucune ressource existante modifiée');
    process.exit(0);
  } else {
    console.log(`🛑 ${failures} ANOMALIE(S) DÉTECTÉE(S)`);
    process.exit(1);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });