const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function decodeJwtPayload(token: string) {
  const part = token.split('.')[1];
  if (!part) throw new Error('Invalid JWT');
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(atob(padded));
}

function instructionFor(type: string) {
  const shared = 'Escribe en español natural, íntimo y romántico, sin clichés excesivos, sin inventar hechos que no estén en el contexto. No menciones que eres una IA. Entrega solo el texto final, sin títulos markdown ni explicaciones.';
  const specific: Record<string, string> = {
    reason: 'Crea una sola razón breve y distinta por la que una persona elegiría a su pareja. Máximo 2 oraciones.',
    letter: 'Escribe una carta amorosa profunda y cálida, de 4 a 7 párrafos cortos. Debe sentirse personal y honesta.',
    chapter: 'Transforma el borrador en un capítulo de recuerdos de 2 a 4 párrafos. Mantén los hechos exactos y agrega emoción, no hechos nuevos.',
    caption: 'Crea una dedicatoria breve para acompañar un recuerdo. Máximo 3 oraciones.',
    date_idea: 'Propón una cita de pareja concreta, bonita y realista. Incluye una idea principal y un pequeño detalle especial.',
    question: 'Crea una pregunta de pareja significativa, positiva y fácil de responder en conversación.',
    recap: 'Resume los recuerdos proporcionados como un pequeño “wrapped” romántico del período, resaltando patrones y momentos sin inventar estadísticas.',
    general: 'Ayuda a mejorar el texto manteniendo su intención y hechos.'
  };
  return `${shared}\n${specific[type] ?? specific.general}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return json({ error: 'Inicia sesión para usar la IA.' }, 401);

    // Supabase verifies the JWT at the Edge gateway because verify_jwt=true.
    // Here we only distinguish anonymous visitors from permanent accounts.
    const claims = decodeJwtPayload(token);
    if (claims.is_anonymous !== false) {
      return json({ error: 'La IA está disponible solo para las cuentas permanentes de la pareja.' }, 403);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'Falta configurar OPENAI_API_KEY en Supabase Edge Function Secrets.' }, 503);

    const body = await req.json().catch(() => ({}));
    const type = String(body.type || 'general').slice(0, 40);
    const prompt = String(body.prompt || '').slice(0, 8000);
    const context = JSON.stringify(body.context || {}).slice(0, 12000);
    const requestedMax = Number(body.maxLength || 600);
    const maxOutputTokens = Math.max(120, Math.min(1500, Math.ceil(requestedMax * 1.8)));
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini';

    const input = [
      { role: 'developer', content: [{ type: 'input_text', text: instructionFor(type) }] },
      { role: 'user', content: [{ type: 'input_text', text: `Contexto real:\n${context}\n\nBorrador o petición:\n${prompt || 'Genera una versión nueva basada solo en el contexto.'}` }] }
    ];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, input, max_output_tokens: maxOutputTokens, store: false })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', response.status, data?.error?.message || data);
      return json({ error: data?.error?.message || 'OpenAI rechazó la solicitud.' }, 502);
    }

    let text = '';
    for (const item of data.output || []) {
      for (const part of item.content || []) {
        if (part.type === 'output_text' && typeof part.text === 'string') text += part.text;
      }
    }
    text = text.trim();
    if (!text) return json({ error: 'OpenAI respondió sin texto.' }, 502);
    return json({ text, model });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 500);
  }
});
