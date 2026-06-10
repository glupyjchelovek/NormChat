'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadData, addTask, updateTask, assignDecoration } from '@/lib/storage';
import type { Task } from '@/lib/types';

const DECO_EMOJI: Record<string, string> = {
  cactus: '🌵',
  rock: '🪨',
  flower: '🌸',
  bench: '🪑',
};

const AVATAR_EMOJI: Record<string, string> = {
  forest: '🌲',
  night: '🌙',
  sunny: '☀️',
  lake: '💧',
};

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<{ nickname: string; avatarId: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = loadData();
    if (!data.user) {
      router.replace('/');
      return;
    }
    setUser(data.user);
    setTasks(data.tasks);
  }, [router]);

  if (!mounted || !user) return null;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const task: Task = {
      id: Date.now().toString(),
      title,
      done: false,
      reward: assignDecoration(title, tasks.length),
      planted: false,
    };
    addTask(task);
    setTasks(prev => [...prev, task]);
    setNewTitle('');
  }

  function handleMarkDone(id: string) {
    updateTask(id, { done: true });
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, done: true } : t)));
  }

  function handlePlant(task: Task) {
    router.push(`/garden?decoration=${task.reward}&taskId=${task.id}`);
  }

  const active = tasks.filter(t => !t.planted);
  const planted = tasks.filter(t => t.planted);

  return (
    <main className="max-w-lg mx-auto p-5 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-pixel text-sm text-green-800">Pixel Garden</h1>
          <p className="text-xs text-stone-400 mt-1">your task list</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border-2 border-stone-200 rounded-xl px-3 py-2">
            <span className="text-lg leading-none">{AVATAR_EMOJI[user.avatarId]}</span>
            <span className="text-xs font-medium text-stone-700">{user.nickname}</span>
          </div>
          <button
            onClick={() => router.push('/garden')}
            className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            🌿 Garden
          </button>
        </div>
      </div>

      {/* Add task */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 border-2 border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:border-green-400 font-mono text-sm transition-colors"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-stone-200 disabled:text-stone-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
        >
          + Add
        </button>
      </form>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🌱</div>
          <p className="text-sm text-stone-400 font-mono">Add your first task to start growing!</p>
        </div>
      )}

      {/* Active tasks */}
      {active.length > 0 && (
        <div className="space-y-2 mb-6">
          {active.map(task => (
            <div
              key={task.id}
              className={`bg-white border-2 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${
                task.done ? 'border-green-200' : 'border-stone-200'
              }`}
            >
              {/* Done toggle */}
              {!task.done ? (
                <button
                  onClick={() => handleMarkDone(task.id)}
                  className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-stone-300 hover:border-green-500 transition-colors"
                  title="Mark done"
                />
              ) : (
                <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-green-500 text-sm">
                  ✓
                </span>
              )}

              {/* Title */}
              <span
                className={`flex-1 text-sm font-mono min-w-0 truncate ${
                  task.done ? 'text-stone-400 line-through' : 'text-stone-700'
                }`}
              >
                {task.title}
              </span>

              {/* Reward badge */}
              <span className="text-lg flex-shrink-0" title={task.reward}>
                {DECO_EMOJI[task.reward]}
              </span>

              {/* Plant it */}
              {task.done && (
                <button
                  onClick={() => handlePlant(task)}
                  className="flex-shrink-0 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Plant it 🌿
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Planted tasks */}
      {planted.length > 0 && (
        <div>
          <p className="text-xs text-stone-300 font-mono mb-2">── planted in garden ──</p>
          <div className="space-y-2 opacity-40">
            {planted.map(task => (
              <div
                key={task.id}
                className="bg-white border-2 border-stone-100 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-green-400 text-sm">
                  ✓
                </span>
                <span className="flex-1 text-sm font-mono text-stone-400 line-through truncate">
                  {task.title}
                </span>
                <span className="text-lg flex-shrink-0">{DECO_EMOJI[task.reward]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
