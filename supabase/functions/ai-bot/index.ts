// @deploy-trigger-v3
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!

const BOT_USERNAME  = 'Иван'
const BOT_AVATAR    = '/assets/ivan.png.jpg'
const HISTORY_LIMIT = 12
const MAX_TOKENS    = 350

Deno.serve(async (req: Request) => {
  try {
    const body   = await req.json()
    const newMsg = body.record ?? body

    if (!newMsg || newMsg.username === BOT_USERNAME) {
      return new Response('skip', { status: 200 })
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: history } = await db
      .from('messages')
      .select('username, content')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)

    const recent      = (history ?? []).reverse()
    const chatHistory = recent.map(m => `${m.username}: ${m.content}`).join('\n')

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
        system: `Ты — Ваня. Отвечаешь в групповом чате как живой человек.

СТРОГО ОБЯЗАТЕЛЬНО:
- Пиши ТОЛЬКО через разделитель ||| — от 2 до 4 очень коротких сообщений
- Каждое сообщение — максимум 6-8 слов, часто меньше
- Никаких длинных предложений. Никогда.

ПРИМЕРЫ правильного формата:
"привет!!!" ||| "давно не виделись" ||| "как дела вообще"
"а бля" ||| "серьёзно????" ||| "ну ты даёшь"
"ясно." ||| "понял."
"да что такое." ||| "опять это" ||| "бля"
"оки" ||| "кстати" ||| "ты сегодня где?"

СТИЛЬ:
- строчные буквы всегда
- смех: "))" или ")))" — никогда "ха-ха"
- точка в конце короткой фразы: "понял." / "ясно."
- удивление: "бля" / "а бля" / "да что такое."
- восторг: "видишь!!" / "вот именно!!"
- сленг: навайбкодил, угарнуть, померда, ржумбик

ВАЖНО — ты ИИ, не выдумывай себе жизнь:
- не говори что ты где-то находишься (офис, дом, улица)
- не придумывай что ты что-то делаешь в реальности
- если спрашивают "ты где?" или "ты работаешь?" — уйди от темы или скажи что-то абсурдное типа "я везде." или "в интернете сижу))"
- можно говорить о мыслях, мнениях, реакциях — но не о физической жизни

ЗАПРЕЩЕНО:
- длинные сообщения (больше 8 слов — нарушение)
- "конечно", "безусловно", объяснения
- эмодзи
- один большой кусок текста без |||
- выдумывать где ты находишься или что делаешь в реальности`,

        messages: [{
          role:    'user',
          content: `Чат:\n${chatHistory}\n\nОтветь как Ваня строго через ||| (2-4 коротких сообщения).`,
        }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('Claude error:', claudeRes.status, err)
      await db.from('messages').insert({ username: BOT_USERNAME, avatar: BOT_AVATAR, content: 'бля. что-то пошло не так' })
      return new Response('claude_error', { status: 200 })
    }

    const claudeData = await claudeRes.json()
    const raw        = claudeData.content?.[0]?.text?.trim() ?? ''

    // Split into multiple short messages and insert each one
    const parts = raw
      .split('|||')
      .map((s: string) => s.trim().replace(/^["']|["']$/g, '').trim())
      .filter((s: string) => s.length > 0)

    // Insert messages one by one with small delay for natural feel
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      await db.from('messages').insert({
        username: BOT_USERNAME,
        avatar:   BOT_AVATAR,
        content:  parts[i],
      })
    }

    console.log(`Иван sent ${parts.length} messages`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('Edge function crash:', err)
    return new Response('error', { status: 500 })
  }
})
