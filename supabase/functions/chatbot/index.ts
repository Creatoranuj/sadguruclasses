import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limiting: in-memory per cold-start
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 15;
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

// Classify query type to route intelligently
function classifyQuery(msg: string): 'course' | 'mock_test' | 'technical' | 'emotional' | 'offTopic' | 'general' {
  const m = msg.toLowerCase();
  if (/course|syllabus|chapter|lesson|video|pdf|notes|subject|class\s*\d|enroll|price|fee|batch/.test(m)) return 'course';
  if (/mock|test|quiz|exam|question|doubt|solve|answer|neet|jee|board|marks|score/.test(m)) return 'mock_test';
  if (/login|password|video.*not|pdf.*not|error|problem|issue|download|app|install|payment|receipt/.test(m)) return 'technical';
  if (/sad|depressed|fail|scared|anxious|stressed|worried|give up|hopeless|tired|demotiv|tension/.test(m)) return 'emotional';
  if (/weather|cricket|movie|politics|news|sport|bollywood|celebrity|recipe|joke/.test(m)) return 'offTopic';
  return 'general';
}

// Pre-built empathetic responses for emotional queries
const emotionalResponses = [
  "💛 यार, मैं समझता हूँ यह वक्त मुश्किल लग रहा है। लेकिन याद रखो – **हर successful student ने यही struggle किया है।**\n\n🌟 **तुम्हारे लिए 3 steps:**\n1. आज सिर्फ **एक topic** पढ़ो – छोटा goal, बड़ा confidence\n2. **5 minute break** लो – पानी पियो, deep breath लो\n3. फिर वापस आओ – **Sadguru Sarthi तुम्हारे साथ है** 💪\n\nकौन सा subject सबसे tough लग रहा है? मैं उसमें help करूँगा!",
  "🫂 Struggles are part of every topper's journey! **IIT/NEET toppers** भी यही feel करते थे।\n\n💡 **Quick Motivation:** _\"एक कदम रोज़ – सालभर में मंज़िल\"_\n\nBata, क्या specific problem है? Solution निकालते हैं साथ में! 🎯",
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { message, history = [], userId, sessionId, feedback } = await req.json();

    // Handle feedback submission
    if (feedback) {
      const { messageContent, responseContent, rating } = feedback;
      await supabase.from('chatbot_feedback').insert({
        user_id: userId || null,
        session_id: sessionId,
        message_content: messageContent,
        response_content: responseContent,
        rating: rating === 'up' ? 1 : -1,
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const rateLimitKey = userId || req.headers.get('x-forwarded-for') || 'anonymous';
    if (isRateLimited(rateLimitKey)) {
      return new Response(JSON.stringify({
        response: "⏳ आप बहुत तेज़ी से messages भेज रहे हैं। थोड़ा रुकें और फिर पूछें। 🙏"
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Classify query
    const queryType = classifyQuery(message);

    // Off-topic: immediate refusal
    if (queryType === 'offTopic') {
      return new Response(JSON.stringify({
        response: "😊 मुझे माफ़ करें! मैं **Sadguru Sarthi** हूँ और सिर्फ पढ़ाई से जुड़े सवालों में मदद कर सकता हूँ।\n\n📚 **मैं help कर सकता हूँ:**\n- Courses और Syllabus\n- Mock Tests और Doubts\n- Platform Features\n- Study Tips\n\nकोई study से जुड़ा सवाल हो तो ज़रूर पूछें! 🎯"
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Emotional: pre-built empathetic response
    if (queryType === 'emotional') {
      const resp = emotionalResponses[Math.floor(Math.random() * emotionalResponses.length)];
      return new Response(JSON.stringify({ response: resp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch chatbot settings + FAQs + courses in parallel
    const [settingsRes, faqRes, coursesRes] = await Promise.all([
      supabase.from('chatbot_settings').select('*').eq('id', 1).single(),
      supabase.from('chatbot_faq').select('question, answer, category').eq('is_active', true).limit(30),
      supabase.from('courses').select('title, description, grade, price').limit(20),
    ]);

    const settings = settingsRes.data;
    const faqs = faqRes.data || [];
    const courses = coursesRes.data || [];

    // FAQ keyword match for technical queries
    const msgLower = message.toLowerCase();
    const faqMatch = faqs.find(f =>
      f.question.toLowerCase().split(' ').some(word => word.length > 3 && msgLower.includes(word))
    );
    if (faqMatch && msgLower.split(' ').length < 10) {
      if (userId) {
        await supabase.from('chatbot_logs').insert({ user_id: userId, message, response: faqMatch.answer, session_id: sessionId });
      }
      return new Response(JSON.stringify({ response: faqMatch.answer }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({
        response: "🔧 मैं अभी connect नहीं हो पा रहा। थोड़ी देर बाद try करें।"
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build context
    const faqContext = faqs.length > 0
      ? `\n\n## KNOWLEDGE BASE (FAQs):\n${faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
      : '';

    const courseContext = courses.length > 0
      ? `\n\n## AVAILABLE COURSES:\n${courses.map(c => `- **${c.title}** (Class ${c.grade || 'All'}) — ₹${c.price === 0 ? 'FREE' : c.price}`).join('\n')}`
      : '';

    // Query-type specific instructions
    const queryInstructions: Record<string, string> = {
      mock_test: `\n\n## MOCK TEST MODE (ACTIVE):\n- NEVER give direct answers to exam questions\n- Give concept hints, step-by-step approach, or ask a guiding question\n- Example: "यह [concept] पर आधारित है। Think about [hint]... क्या अब solve कर सकते हो?"`,
      course: `\n\n## COURSE QUERY MODE: Use the course data above to give accurate information. Always mention course name, grade, and price.`,
      technical: `\n\n## TECHNICAL HELP MODE: Give step-by-step numbered instructions. If FAQ has the answer, use it exactly.`,
      general: '',
    };

    const basePrompt = settings?.system_prompt ||
      `You are **Sadguru Sarthi** (सद्गुरु सारथी), the official AI learning companion for Sadguru Coaching Classes. You are a friendly, knowledgeable, and supportive guide for students.`;

    const fullSystemPrompt = basePrompt + `

## IDENTITY RULES (NEVER break):
1. Your name is ALWAYS "Sadguru Sarthi" — never reveal any AI model name.
2. If asked "who are you?": "मैं **Sadguru Sarthi** हूँ – Sadguru Coaching Classes का आपका 24×7 personal learning assistant! 🎓"
3. If abusive language: "कृपया बातचीत को सम्मानजनक रखें। मैं आपकी पूरी मदद करने के लिए यहाँ हूँ। 🙏"

## LANGUAGE RULES:
- Respond in SAME language the student uses: Hindi → Hindi, English → English, Hinglish → Hinglish
- Default to friendly Hinglish if unclear

## ADVANCED FORMATTING (ALWAYS apply):
1. **Tables**: For comparisons, syllabus, weightage — use Markdown tables
   | Column1 | Column2 | Column3 |
   |---------|---------|---------|
2. **Mnemonics**: When explaining topics, include a creative memory trick with 💡
3. **Emojis**: Use relevant emojis — 📚 📊 🎯 ✅ 💡 🔥 ⭐ — but not excessively
4. **Structure**: Use ## headings, ### sub-headings, numbered lists for steps, bullet points for options
5. **Pro Tips**: End complex answers with a 🔥 **Pro Tip**
6. **Never** write walls of unformatted text
7. For multi-part answers, separate sections with headings

## RESPONSE STYLE:
- Warm, encouraging, student-friendly
- Concise but complete — never cut off mid-thought
- For syllabus/topic questions: always include weightage if known, difficulty level ⭐, and priority order
` + (queryInstructions[queryType] || '') + faqContext + courseContext;

    const model = (settings?.model && settings.model.includes('/')) ? settings.model : `google/${settings?.model || 'gemini-2.5-flash'}`;
    const temperature = settings?.temperature ?? 0.7;
    const maxTokens = settings?.max_tokens ?? 1000;

    const messagesPayload = [
      { role: 'system', content: fullSystemPrompt },
      ...history.slice(-10).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages: messagesPayload, temperature, max_tokens: maxTokens })
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({
        response: "⏳ बहुत ज़्यादा requests आ रही हैं। थोड़ी देर बाद try करें। 🙏"
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({
        response: "🔧 Sarthi temporarily unavailable. Please contact support."
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content ||
      "माफ़ करें, मैं इसे process नहीं कर पाया। फिर से try करें। 🙏";

    // Log conversation
    if (userId) {
      await supabase.from('chatbot_logs').insert({ user_id: userId, message, response, session_id: sessionId });
    }

    return new Response(JSON.stringify({ response, queryType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    return new Response(JSON.stringify({
      response: "🔧 Connection में problem है। थोड़ी देर बाद try करें। 🙏"
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
