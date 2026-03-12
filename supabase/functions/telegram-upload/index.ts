import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!TELEGRAM_CHAT_ID) throw new Error('TELEGRAM_CHAT_ID is not configured. Set it as a Supabase secret.');

    // Validate user auth
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

    // Check admin role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleData } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).single();
    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const lessonId = formData.get('lesson_id') as string | null;
    const fileName = formData.get('file_name') as string || file?.name || 'document.pdf';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send document to Telegram via gateway
    const telegramForm = new FormData();
    telegramForm.append('chat_id', TELEGRAM_CHAT_ID);
    telegramForm.append('document', file, fileName);
    telegramForm.append('caption', `📄 ${fileName} | Lesson: ${lessonId || 'N/A'}`);

    const telegramRes = await fetch(`${GATEWAY_URL}/sendDocument`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
      },
      body: telegramForm,
    });

    const telegramData = await telegramRes.json();
    if (!telegramRes.ok || !telegramData.ok) {
      throw new Error(`Telegram API failed [${telegramRes.status}]: ${JSON.stringify(telegramData)}`);
    }

    const telegramFileId = telegramData.result?.document?.file_id;
    if (!telegramFileId) {
      throw new Error('No file_id returned from Telegram');
    }

    // Save to telegram_files table
    const { data: dbRecord, error: dbError } = await supabase
      .from('telegram_files')
      .insert({
        lesson_id: lessonId || null,
        file_id: telegramFileId,
        file_name: fileName,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      // Still return success since file is on Telegram
    }

    return new Response(JSON.stringify({
      success: true,
      file_id: telegramFileId,
      file_name: fileName,
      file_size: file.size,
      telegram_url: `telegram://${telegramFileId}`,
      db_record: dbRecord,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('telegram-upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
