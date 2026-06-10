'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadData, setUser } from '@/lib/storage';
import type { AvatarId } from '@/lib/types';

const AVATARS: { id: AvatarId; emoji: string; label: string }[] = [
  { id: 'forest', emoji: '🌲', label: 'Forest' },
  { id: 'night', emoji: '🌙', label: 'Night' },
  { id: 'sunny', emoji: '☀️', label: 'Sunny' },
  { id: 'lake', emoji: '💧', label: 'Lake' },
];

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('forest');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = loadData();
    if (data.user) router.replace('/tasks');
  }, [router]);

  if (!mounted) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) return;
    setUser({ nickname: name, avatarId });
    router.push('/tasks');
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="mb-8 text-center">
        <h1 className="font-pixel text-xl text-green-800 mb-3">Pixel Garden</h1>
        <p className="text-sm text-stone-500">complete tasks · grow your garden</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border-2 border-stone-300 rounded-2xl p-8 w-full max-w-sm shadow-md flex flex-col gap-6"
      >
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wider">
            Your nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="e.g. masha"
            maxLength={20}
            autoFocus
            className="w-full border-2 border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:border-green-400 font-mono text-sm transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-3 uppercase tracking-wider">
            Choose your avatar
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map(av => (
              <button
                key={av.id}
                type="button"
                onClick={() => setAvatarId(av.id)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all ${
                  avatarId === av.id
                    ? 'border-green-500 bg-green-50 shadow-sm scale-105'
                    : 'border-stone-200 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <span className="text-2xl">{av.emoji}</span>
                <span className="text-xs text-stone-500">{av.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!nickname.trim()}
          className="bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Enter Garden →
        </button>
      </form>

      <p className="mt-6 text-xs text-stone-400">
        Your garden is saved locally in your browser.
      </p>
    </main>
  );
}
