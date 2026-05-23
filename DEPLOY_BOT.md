# 🤖 NormBot — Setup Guide

NormBot is powered by **Claude AI** (Anthropic) and runs as a **Supabase Edge Function**.
When any user sends a message, the edge function is triggered automatically, calls Claude, and posts the reply.

---

## 📋 What you need

- Your **Anthropic API key** (`sk-ant-api03-…`) — you already have this
- Your **Supabase project** already set up (from the main README)

---

## 🚀 Option A — Deploy via GitHub Actions (Easiest)

Just add 3 secrets to your GitHub repo and push. GitHub Actions deploys everything automatically.

### Step 1 — Add GitHub Secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Add these 3 secrets:

| Secret name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Get from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → Generate new token |
| `SUPABASE_PROJECT_ID` | `mglzaxlqzgurdpnkbilb` |
| `ANTHROPIC_API_KEY` | Your `sk-ant-api03-…` key |

### Step 2 — Push the code

The GitHub Action runs automatically when you push to `main`.
It will deploy the edge function and set the API key secret in Supabase.

### Step 3 — Set up the Database Webhook

In **Supabase Dashboard → Database → Webhooks → Create a new hook**:

| Field | Value |
|---|---|
| Name | `ai-bot-trigger` |
| Table | `messages` |
| Events | ✅ INSERT only |
| Type | **Supabase Edge Functions** |
| Edge Function | `ai-bot` |
| HTTP Method | POST |

Click **Confirm**. Done! 🎉

---

## 🔧 Option B — Deploy via Supabase CLI

If you prefer the command line:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref mglzaxlqzgurdpnkbilb

# Deploy the edge function
supabase functions deploy ai-bot --no-verify-jwt

# Set your Anthropic API key as a Supabase secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

Then set up the database webhook as shown in Step 3 above.

---

## ✅ Testing the bot

1. Open the chat app
2. Type any message and send
3. After ~1-3 seconds, **NormBot 🤖** should reply with a green bubble
4. You'll see a pulsing "thinking" animation while it generates the reply

---

## 🛠️ Customizing the bot

Edit `supabase/functions/ai-bot/index.ts`:

- **Bot personality** → change the `system` prompt
- **Response length** → change `MAX_TOKENS` (250 = ~2 sentences)
- **Chat history** → change `HISTORY_LIMIT` (how many past messages Claude sees)
- **Bot name** → change `BOT_USERNAME` and `BOT_AVATAR` (also update `js/app.js`)

After editing, re-deploy with:
```bash
supabase functions deploy ai-bot --no-verify-jwt
```

---

## 🔒 Security note

The API key is stored as a **Supabase Secret** (environment variable) — it's never in the frontend code or committed to Git.
