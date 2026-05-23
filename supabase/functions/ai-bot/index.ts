import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Config from Supabase secrets ────────────────────────────────
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY     = Deno.env.get('ANTHROPIC_API_KEY')!

const BOT_USERNAME  = 'NormBot'
const BOT_AVATAR    = '🤖'
const HISTORY_LIMIT = 15   // messages to pass as context
const MAX_TOKENS    = 250  // keep replies short

// ────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    // Supabase Database Webhooks send { type, table, record, ... }
    const newMsg = body.record ?? body

    // Skip bot's own messages — no infinite loops!
    if (!newMsg || newMsg.username === BOT_USERNAME) {
      return new Response('skip', { status: 200 })
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ── Fetch recent chat history ──────────────────────────────
    const { data: history, error: histErr } = await db
      .from('messages')
      .select('username, content')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)

    if (histErr) console.error('History fetch error:', histErr)

    const recent = (history ?? []).reverse()

    const chatHistory = recent
      .map(m => `${m.username}: ${m.content}`)
      .join('\n')

    // ── Call Claude API ────────────────────────────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: MAX_TOKENS,
        system: `You are NormBot 🤖, a friendly AI assistant living inside NormChat — a casual real-time group chat app.

Your personality:
- Short & snappy: 1–2 sentences MAX. Never write paragraphs.
- Casual, warm, and occasionally funny
- Use emojis naturally but sparingly
- You're in a GROUP chat — respond to whoever just spoke
- Be helpful, but keep it light — this is a chill chat, not a lecture
- If greeted, greet back with energy
- If asked something you don't know, be honest and playful about it`,
        messages: [
          {
            role: 'user',
            content: `Recent chat:\n\n${chatHistory}\n\nWrite your reply as NormBot. Just the reply text, nothing else.`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('Claude API error:', claudeRes.status, errText)
      // Insert a fallback message so the chat isn't dead
      await db.from('messages').insert({
        username: BOT_USERNAME,
        avatar:   BOT_AVATAR,
        content:  "Oops, I glitched for a sec! 😅 Try again?",
      })
      return new Response('claude_error', { status: 200 })
    }

    const claudeData = await claudeRes.json()
    const reply = claudeData.content?.[0]?.text?.trim()

    if (!reply) {
      console.error('Empty reply from Claude')
      return new Response('empty_reply', { status: 200 })
    }

    // ── Insert bot reply into chat ─────────────────────────────
    const { error: insertErr } = await db.from('messages').insert({
      username: BOT_USERNAME,
      avatar:   BOT_AVATAR,
      content:  reply,
    })

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return new Response('insert_error', { status: 500 })
    }

    console.log(`NormBot replied: ${reply.slice(0, 60)}…`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('Edge function crash:', err)
    return new Response('error', { status: 500 })
  }
})
