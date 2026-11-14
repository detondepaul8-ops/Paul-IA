import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint — reports configuration presence and ZAI connectivity.
 * Never returns secret values, only booleans/keys/error messages.
 */
export async function GET() {
  const configJson = process.env.ZAI_CONFIG_JSON;
  const result: Record<string, unknown> = {
    zaiConfigPresent: Boolean(configJson),
    zaiConfigLength: configJson ? configJson.length : 0,
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    region: process.env.VERCEL_REGION || 'local',
  };

  if (configJson) {
    try {
      const parsed = JSON.parse(configJson);
      result.zaiConfigKeys = Object.keys(parsed);
      result.baseUrl = parsed.baseUrl; // URL, pas un secret
      try {
        const zaiModule = await import('z-ai-web-dev-sdk');
        const ZAI = zaiModule.default;
        const zai = new (ZAI as unknown as new (config: Record<string, string>) => typeof ZAI)(parsed);
        const t0 = Date.now();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Réponds en un mot.' },
            { role: 'user', content: 'ping' },
          ],
          max_tokens: 10,
        });
        result.zaiCallOk = true;
        result.zaiCallMs = Date.now() - t0;
        result.zaiReply = completion.choices?.[0]?.message?.content ?? '';
      } catch (err) {
        result.zaiCallOk = false;
        result.zaiCallError = err instanceof Error ? err.message : String(err);
      }
    } catch (err) {
      result.zaiConfigParseOk = false;
      result.zaiConfigParseError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(result);
}
