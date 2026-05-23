# 💬 NormChat

A **real-time chat app** where two (or more) people can join from any device, pick a fun emoji avatar, and start chatting instantly — powered by [Supabase](https://supabase.com).

---

## ✨ Features

- 🎨 **Colorful & Fun** — gradient design with a vibrant chat UI
- 🐱 **Emoji Avatars** — pick from 20 cute animal/character avatars
- ⚡ **Real-time** — messages appear instantly on all connected devices (Supabase Realtime)
- ✍️ **Typing indicator** — see when someone is typing
- 😊 **Emoji picker** — built-in emoji panel
- 📱 **Responsive** — works on mobile, tablet, and desktop
- 💾 **Session memory** — your name & avatar are saved so you don't re-enter every time

---

## 🚀 Setup (one-time, takes ~2 minutes)

### 1. Run the SQL in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open the project → **SQL Editor**
3. Paste and run the contents of [`supabase_setup.sql`](./supabase_setup.sql)

This creates the `messages` table and enables Realtime + Row Level Security.

### 2. Enable Realtime on the table

1. In Supabase Dashboard → **Database** → **Replication**
2. Find `messages` in the table list and toggle **Realtime ON**

*(The SQL script also tries to do this automatically — but double-check in the dashboard.)*

### 3. Open the app

Just open `index.html` in your browser — **no build step, no server needed!**

Or deploy it anywhere static:
- **GitHub Pages** — push to a repo, go to Settings → Pages → deploy from branch
- **Netlify / Vercel** — drag & drop the folder
- **Any web host** — upload the files

---

## 📁 Project Structure

```
NormChat/
├── index.html            # Main HTML (single page)
├── css/
│   └── style.css         # All styles — colorful & fun 🎨
├── js/
│   └── app.js            # App logic + Supabase integration
├── supabase_setup.sql    # SQL to run in Supabase dashboard
└── README.md
```

---

## 🛠️ Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | Vanilla HTML / CSS / JS |
| Realtime  | Supabase Realtime (WebSockets) |
| Database  | Supabase (PostgreSQL) |
| Fonts     | Google Fonts — Inter |

---

## 🎮 How It Works

1. **User visits the page** → enters a name + picks an emoji avatar
2. **Profile saved** in `localStorage` — no login required
3. **Supabase Realtime** broadcasts new messages to all connected clients instantly
4. **Typing indicator** uses Supabase broadcast channels (no DB writes)
5. **Optimistic UI** — your message appears immediately, then confirms via DB

---

## 🔒 Security Notes

- The Supabase `anon` key is safe to expose in the frontend (it's public by design)
- Row Level Security (RLS) is enabled — only SELECT and INSERT are allowed
- No user authentication is required — this is a public, open chat room
- For a private chat, you'd add Supabase Auth + per-user RLS policies

---

Made with ❤️ and way too many emojis 🎉
