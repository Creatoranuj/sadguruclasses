import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

    // Validate user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { file_id } = await req.json();
    if (!file_id) {
      return new Response(JSON.stringify({ error: 'file_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get file path from Telegram via gateway
    const getFileRes = await fetch(`${GATEWAY_URL}/getFile?file_id=${encodeURIComponent(file_id)}`, {
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
      },
    });

    const getFileData = await getFileRes.json();
    if (!getFileRes.ok || !getFileData.ok) {
      throw new Error(`Telegram getFile failed [${getFileRes.status}]: ${JSON.stringify(getFileData)}`);
    }

    const filePath = getFileData.result?.file_path;
    if (!filePath) {
      throw new Error('No file_path returned from Telegram');
    }

    // Download file content through gateway
    // The gateway pattern: /file/<file_path>
    const fileUrl = `${GATEWAY_URL}/file/${filePath}`;
    const fileRes = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
      },
    });

    if (!fileRes.ok) {
      throw new Error(`Failed to download file from Telegram [${fileRes.status}]`);
    }

    // Stream file back to client
    return new Response(fileRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': fileRes.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition': `inline; filename="document.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('telegram-download error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
