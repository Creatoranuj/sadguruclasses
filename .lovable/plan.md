
## Plan: Sadguru Sarthi – Complete Rebrand & Enhancement

### What the user wants
The user has written a detailed spec for "Sadguru Sarthi" (सद्गुरु सारथी). This is primarily a **rebrand + behavior upgrade** of the existing chatbot. Key changes needed:

1. **Name change**: "Sadguru Chatbot" → "Sadguru Sarthi" everywhere
2. **System prompt upgrade**: Stronger identity rules — always introduce as "Sadguru Sarthi", refuse off-topic with a polite Hindi message, mock test guidance mode (hints, not direct answers), abuse handling
3. **UI tweaks**: Update all display text in ChatWidget and AdminChatbotSettings
4. **Edge function enhancement**: Update base system prompt in the DB default + edge function fallback, add mock test guidance logic, add abuse detection response
5. **Quick prompts update**: Add Hindi quick prompts too for better UX

### Files to change

**1. `src/components/chat/ChatWidget.tsx`**
- Change all "Sadguru Chatbot" references to "Sadguru Sarthi"  
- Update welcome message: "👋 नमस्ते! मैं **Sadguru Sarthi** हूँ..."
- Update reset message
- Update placeholder text: "Sarthi se kuch poochein..."
- Update quick prompts — add Hindi options like "Mock test mein help chahiye", "Course kaunsa lun?"
- Update aria-label and title attributes

**2. `supabase/functions/chatbot/index.ts`**
- Update fallback system prompt to "Sadguru Sarthi" identity
- Add stronger identity enforcement rules in `formattingInstructions`:
  - Never reveal it's powered by Gemini/OpenAI
  - Refuse off-topic: "मैं यहाँ आपकी पढ़ाई में मदद के लिए हूँ।"
  - Mock test guidance: give hints/steps, NOT direct answers
  - Abuse handling: "बातचीत को सम्मानजनक रखें।"
  - Always introduce as "Sadguru Sarthi"

**3. `src/pages/AdminChatbotSettings.tsx`**
- Change heading "Sadguru Chatbot Settings" → "Sadguru Sarthi Settings"
- Update subtitle: "Configure your AI learning companion"
- Update the default system prompt placeholder text

### No DB migration needed
The system_prompt is stored in `chatbot_settings` table and editable by admin. We update the edge function's fallback prompt and redeploy. The admin can update the DB value via the settings page.

### Changes summary
```text
ChatWidget.tsx         — Rebrand name + welcome + quick prompts
chatbot/index.ts       — Stronger system prompt rules + Sarthi identity
AdminChatbotSettings   — Heading update only
```

3 files, purely text/logic changes. No schema changes needed.
