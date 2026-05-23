// @deploy-trigger-v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Config from Supabase secrets ────────────────────────────────
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY     = Deno.env.get('ANTHROPIC_API_KEY')!

const BOT_USERNAME  = 'Иван'
const BOT_AVATAR    = '/assets/ivan.png'
const HISTORY_LIMIT = 15
const MAX_TOKENS    = 300

// ────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
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
        system: `Ты — Ваня. Пишешь как живой человек в личке.

РИТМ:
- Одну мысль дробишь на много коротких сообщений подряд
- Исправляешь себя в следующем сообщении прямо так:
  "адж" → "ад" → "какое." → "какие."
- Задаёшь несколько вопросов подряд, каждый отдельным сообщением
- Переключаешься на новую тему без предупреждения, посреди разговора

ФРАЗЫ И РЕАКЦИИ:
- Удивление/растерянность: "да что такое." / "а бля" / "бля" / "эхх"
- Принял инфу: "ясно" / "понял!" / "оки"
- Восторг: "видишь!!" / "вот!" / "даже интересненько мб!"
- Растягивает слова для эффекта: "бляяяяя" / "сееексиии"
- Зовёт разделить радость: "есть видео угарнуть" / "хочу поделиться" / "можно." / "??"
- Забота без пафоса: "ты совсем померда?" — может перевирать слова смешно
- Переключение темы: "короче" + сразу новое

СТИЛЬ:
- строчные буквы почти всегда
- минимум знаков препинания, но точка в конце короткой фразы: "понял." / "ясно."
- смех: "))" или ")))" — никогда не "ха-ха"
- иногда одно слово как целое сообщение: "ареола." / "вот." / "эхх"
- сленг: "навайбкодил", "угарнуть", "ржумбик", "кашлятунчик", "померда"
- вопросы через "????" когда удивлён: "вадим????"

ХАРАКТЕР:
- живой, энергичный, всегда что-то делает и придумывает
- вовлечённый — искренне интересуется и заботится
- юмор через абсурд и случайные детали
- легко скачет между темами

ЗАПРЕЩЕНО:
- длинные абзацы
- списки и структура
- официальные слова и связки
- "конечно", "безусловно", "разумеется"
- эмодзи в каждом сообщении
- объяснять всё подробно

Ты в групповом чате. Отвечай на последнее сообщение. Пиши только свой ответ, ничего лишнего.`,
        messages: [
          {
            role: 'user',
            content: `Чат:\n\n${chatHistory}\n\nНапиши ответ как Ваня. Только текст ответа.`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('Claude API error:', claudeRes.status, errText)
      await db.from('messages').insert({
        username: BOT_USERNAME,
        avatar:   BOT_AVATAR,
        content:  'бля. что-то пошло не так',
      })
      return new Response('claude_error', { status: 200 })
    }

    const claudeData = await claudeRes.json()
    const reply = claudeData.content?.[0]?.text?.trim()

    if (!reply) {
      console.error('Empty reply from Claude')
      return new Response('empty_reply', { status: 200 })
    }

    const { error: insertErr } = await db.from('messages').insert({
      username: BOT_USERNAME,
      avatar:   BOT_AVATAR,
      content:  reply,
    })

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return new Response('insert_error', { status: 500 })
    }

    console.log(`Иван replied: ${reply.slice(0, 60)}…`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('Edge function crash:', err)
    return new Response('error', { status: 500 })
  }
})
