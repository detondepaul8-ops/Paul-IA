// Teste les modèles multimédias de l'API publique z.ai avec la config de production.
// N'affiche jamais la clé — uniquement statuts et erreurs.
// Usage: ZAI_CONFIG_JSON='<json>' node scripts/test-media-api.mjs

async function main() {
  const raw = process.env.ZAI_CONFIG_JSON.trim();
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = new ZAI(JSON.parse(raw));

  const models = (process.env.ZAI_IMAGE_TEST_MODELS || 'cogview-3-flash,cogview-4-250304').split(',');

  for (const model of models) {
    const t0 = Date.now();
    try {
      const response = await zai.images.generations.create({
        model: model.trim(),
        prompt: 'A small smiling yellow sun, flat illustration',
        size: '1024x1024',
      });
      const item = response?.data?.[0];
      const kind = item?.base64 ? `base64(${String(item.base64).length})` : item?.url ? `url(${item.url.slice(0, 60)}...)` : 'vide';
      console.log(`IMAGE ${model.trim()} → ✅ OK en ${Date.now() - t0}ms — ${kind}`);
    } catch (error) {
      console.log(`IMAGE ${model.trim()} → ❌ ${(error?.message || error).slice(0, 160)}`);
    }
  }

  try {
    const t0 = Date.now();
    const res = await zai.audio.tts.create({
      model: 'cogtts',
      input: 'Bonjour, ceci est un test.',
      voice: 'tongtong',
      response_format: 'wav',
    });
    console.log(`TTS cogtts → ✅ OK en ${Date.now() - t0}ms — clés: ${Object.keys(res || {}).join(',')}`);
  } catch (error) {
    console.log(`TTS → ❌ ${(error?.message || error).slice(0, 160)}`);
  }

  try {
    const t0 = Date.now();
    const task = await zai.video.generations.create({
      prompt: 'A sun rising over the sea, timelapse',
      quality: 'speed',
      with_audio: false,
      size: '1920x1080',
      fps: 30,
      duration: 5,
    });
    console.log(`VIDEO → ✅ tâche lancée ${task.id} (${task.task_status}) en ${Date.now() - t0}ms`);
  } catch (error) {
    console.log(`VIDEO → ❌ ${(error?.message || error).slice(0, 160)}`);
  }
}

main();
