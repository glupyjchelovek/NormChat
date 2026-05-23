-- ════════════════════════════════════════
-- NormChat — Supabase Setup SQL
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor
-- ════════════════════════════════════════

-- 1. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  username    TEXT NOT NULL CHECK (char_length(username) >= 1 AND char_length(username) <= 20),
  avatar      TEXT NOT NULL,
  content     TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

-- 2. Index for fast time-ordered queries
CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at ASC);

-- 3. Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Anyone can read messages (public chat)
CREATE POLICY "Public read" ON public.messages
  FOR SELECT USING (true);

-- 5. Policy: Anyone can send messages
CREATE POLICY "Public insert" ON public.messages
  FOR INSERT WITH CHECK (true);

-- 6. Enable Realtime for the messages table
-- (Do this in Supabase Dashboard → Database → Replication → messages table)
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
