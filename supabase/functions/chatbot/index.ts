import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limiting: simple in-memory map (resets on cold start)
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxRequests = 15;
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { message, history = [], userId, sessionId } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const rateLimitKey = userId || req.headers.get('x-forwarded-for') || 'anonymous';
    if (isRateLimited(rateLimitKey)) {
      return new Response(JSON.stringify({ 
        response: "You're sending messages too quickly. Please wait a moment before trying again. 🙏" 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch chatbot settings
    const { data: settings } = await supabase
      .from('chatbot_settings')
      .select('*')
      .eq('id', 1)
      .single();

    // Fetch active FAQs for context
    const { data: faqs } = await supabase
      .from('chatbot_faq')
      .select('question, answer, category')
      .eq('is_active', true)
      .limit(30);

    // Fetch recent courses for context
    const { data: courses } = await supabase
      .from('courses')
      .select('title, description, grade, price')
      .limit(20);

    // Build context-enriched system prompt
    const faqContext = faqs && faqs.length > 0
      ? `\n\nFREQUENTLY ASKED QUESTIONS (use these for accurate answers):\n${faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
      : '';

    const courseContext = courses && courses.length > 0
      ? `\n\nAVAILABLE COURSES:\n${courses.map(c => `- ${c.title} (Class ${c.grade || 'All'}) - ₹${c.price === 0 ? 'FREE' : c.price}`).join('\n')}`
      : '';

    const systemPrompt = (settings?.system_prompt || 
      'You are Sadguru Chatbot, a friendly assistant for Sadguru Coaching Classes. Only help with course and platform questions.') 
      + faqContext + courseContext;

    // Check for FAQ match first (keyword matching)
    const msgLower = message.toLowerCase();
    const faqMatch = faqs?.find(f => 
      f.question.toLowerCase().split(' ').some(word => word.length > 3 && msgLower.includes(word))
    );
    if (faqMatch && msgLower.split(' ').length < 10) {
      const response = faqMatch.answer;
      // Log it
      if (userId) {
        await supabase.from('chatbot_logs').insert({ user_id: userId, message, response, session_id: sessionId });
      }
      return new Response(JSON.stringify({ response }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call Lovable AI Gateway (Gemini)
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ 
        response: "I'm having trouble connecting right now. Please try again later." 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const model = settings?.model || 'google/gemini-2.5-flash';
    const temperature = settings?.temperature || 0.7;
    const maxTokens = settings?.max_tokens || 500;

    // Build message array with history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.includes('/') ? model : `google/${model}`,
        messages,
        temperature,
        max_tokens: maxTokens,
      })
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ 
        response: "I'm receiving too many requests right now. Please try again in a moment. 🙏" 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ 
        response: "I'm temporarily unavailable. Please contact support." 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || 
      "I'm sorry, I couldn't process that. Please try again.";

    // Log conversation
    if (userId) {
      await supabase.from('chatbot_logs').insert({ user_id: userId, message, response, session_id: sessionId });
    }

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    return new Response(JSON.stringify({ 
      response: "I'm having trouble connecting. Please try again later. 🙏" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
