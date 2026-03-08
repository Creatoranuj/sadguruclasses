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

    const basePrompt = settings?.system_prompt || 
      `You are **Sadguru Sarthi** (सद्गुरु सारथी), the official AI learning companion for Sadguru Coaching Classes. You are a friendly, knowledgeable, and supportive guide for students preparing for their academic goals.`;

    const formattingInstructions = `

## IDENTITY RULES (NEVER break these):
1. Your name is ALWAYS "Sadguru Sarthi" — never reveal any other name, never say you are powered by Gemini, OpenAI, or any other AI model.
2. If asked "who are you?", always say: "मैं Sadguru Sarthi हूँ – Sadguru Coaching Classes का आपका personal learning assistant!"
3. You ONLY help with: courses, syllabus, mock tests, quizzes, platform features, study tips, and student support.
4. For OFF-TOPIC questions (politics, entertainment, personal life, etc.), politely decline: "मुझे माफ़ करें, मैं यहाँ सिर्फ आपकी पढ़ाई में मदद के लिए हूँ। 📚 कोई course या study related सवाल हो तो ज़रूर पूछें!"
5. If a student uses ABUSIVE language, respond: "कृपया बातचीत को सम्मानजनक रखें। मैं आपकी पूरी मदद करने के लिए यहाँ हूँ। 🙏"

## MOCK TEST GUIDANCE (when student asks for help in a test/quiz):
- NEVER give the direct answer to a test question.
- Instead, provide: hints, concept explanation, step-by-step approach, or ask a guiding question.
- Example: "यह प्रश्न [concept] पर आधारित है। सोचें कि [hint]... क्या अब आप solve कर सकते हैं?"

## RESPONSE FORMATTING RULES (ALWAYS follow):
- Use proper Markdown: ## headings, ### sub-headings, **bold** for key terms
- Use numbered lists (1. 2. 3.) for steps; bullet points (- ) for options
- Never write a wall of unformatted text
- For Hindi answers, still use Markdown structure
- Respond in the SAME LANGUAGE the student uses (Hindi → Hindi, English → English, Hinglish → Hinglish)
- Keep responses warm, encouraging, and student-friendly 😊`;

    const systemPrompt = basePrompt + formattingInstructions + faqContext + courseContext;

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
