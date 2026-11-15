// Reproduce the app's exact image-generation call and print the REAL error.
// Usage: ZAI_CONFIG_JSON='<value>' node scripts/test-image-api.mjs
// Never prints the API key/config — only error messages and response shapes.

async function main() {
  const configJson = process.env.ZAI_CONFIG_JSON;
  if (!configJson) {
    console.log('PAS DE ZAI_CONFIG_JSON — test impossible');
    process.exit(1);
  }
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  let raw = configJson.trim();
  if (!raw.startsWith('{')) {
    // The Vercel env API returns values base64-encoded; production stores them decoded.
    raw = Buffer.from(raw, 'base64').toString('utf8');
  }
  const zai = new ZAI(JSON.parse(raw));

  try {
    const response = await zai.images.generations.create({
      model: process.env.ZAI_IMAGE_MODEL || undefined,
      prompt: 'A small smiling yellow sun, flat illustration, white background',
      size: '1024x1024',
    });
    const item = response?.data?.[0];
    console.log('SUCCESS — clés de la réponse:', Object.keys(response || {}));
    if (item) {
      console.log('item keys:', Object.keys(item));
      if (item.base64) console.log('base64 présent, longueur:', String(item.base64).length);
      if (item.url) console.log('url:', item.url);
      if (!item.base64 && !item.url) console.log('ni base64 ni url →', JSON.stringify(item).slice(0, 300));
    } else {
      console.log('data vide →', JSON.stringify(response).slice(0, 300));
    }
  } catch (error) {
    console.log('ERREUR CAPTURÉE:');
    console.log('  name:', error?.name);
    console.log('  message:', error?.message);
    console.log('  status:', error?.status ?? error?.response?.status);
    const body = error?.response?.data ?? error?.body ?? error?.error;
    if (body) console.log('  body:', JSON.stringify(body).slice(0, 500));
  }
}

main();
