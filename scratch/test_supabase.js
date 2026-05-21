const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://akontludfisgxwlnayvs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qQ2lCD9UTN77IGsvNi6X5g_LXBeLTkq';

async function runTest() {
  console.log("=== Test de integración Supabase ===\n");
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Lectura config_clase
  console.log("[1] Lectura config_clase...");
  const { data: configData, error: configError } = await db
    .from('config_clase').select('key,value').limit(5);
  if (configError) console.error("  ✗ Error:", configError.message);
  else console.log("  ✓ OK. Filas:", configData.length, "| Claves:", configData.map(r=>r.key));

  // 2. Simula dbSet (check-then-update-or-insert) para validar que no hay pérdida de datos
  console.log("\n[2] dbSet (check→insert→update) en config_clase...");
  async function dbSetTest(key, value) {
    const { data } = await db.from('config_clase').select('id').eq('key', key).maybeSingle();
    if (data) {
      const { error } = await db.from('config_clase').update({ value }).eq('key', key);
      return error;
    } else {
      const { error } = await db.from('config_clase').insert({ key, value });
      return error;
    }
  }
  const testKey = '_test_dbset_'+Date.now();
  const e1 = await dbSetTest(testKey, 'v1');
  const e2 = await dbSetTest(testKey, 'v2');
  if (e1||e2) {
    console.error("  ✗ Error en dbSet:", (e1||e2).message);
  } else {
    const { data: verify } = await db.from('config_clase').select('value').eq('key',testKey).single();
    const ok = verify?.value === 'v2';
    console.log("  "+(ok?'✓':'✗')+" dbSet OK. Valor final:", verify?.value, "(debe ser 'v2')");
    await db.from('config_clase').delete().eq('key', testKey); // limpieza
  }

  // 3. Stile via config_clase (nueva arquitectura: no requiere tabla separada)
  console.log("\n[3] Stile items via config_clase...");
  const stileKey = 'stile_items';

  // Simula getStileItems
  const { data: stileRaw } = await db.from('config_clase').select('value').eq('key', stileKey).maybeSingle();
  const existingItems = (() => { try { return JSON.parse(stileRaw?.value || '[]'); } catch { return []; } })();
  console.log("  ✓ Items actuales:", existingItems.length);

  // Simula saveStileItems (añadir + actualizar)
  console.log("\n[4] Ciclo completo: añadir → verificar → borrar stile item...");
  const newItem = { id: Date.now().toString(), titulo: '__test__', imagen_url: 'https://example.com/test.jpg', created_at: new Date().toISOString() };
  const updatedItems = [newItem, ...existingItems];
  const eAdd = await dbSetTest(stileKey, JSON.stringify(updatedItems));
  if (eAdd) { console.error("  ✗ Error añadiendo item:", eAdd.message); }
  else {
    // Verificar
    const { data: verify } = await db.from('config_clase').select('value').eq('key', stileKey).maybeSingle();
    const parsed = (() => { try { return JSON.parse(verify?.value || '[]'); } catch { return []; } })();
    const found = parsed.find(x => x.id === newItem.id);
    console.log("  " + (found ? '✓' : '✗') + " Item encontrado tras guardar:", found ? 'sí' : 'no');
    // Limpiar: restaurar lista original
    const eDel = await dbSetTest(stileKey, JSON.stringify(existingItems));
    console.log("  " + (!eDel ? '✓' : '✗') + " Limpieza OK");
  }

  // 5. linguastrike_scores
  console.log("\n[5] Lectura linguastrike_scores...");
  const { data: scoreData, error: scoreError } = await db
    .from('linguastrike_scores').select('*').order('score',{ascending:false}).limit(3);
  if (scoreError) console.error("  ✗ Error:", scoreError.message);
  else console.log("  ✓ OK. Entradas:", scoreData.length);

  console.log("\n=== Test completado ===");
}

runTest().catch(e => console.error("Error fatal:", e.message));
