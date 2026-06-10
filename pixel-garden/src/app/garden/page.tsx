'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadData, placeDecoration, updateTask } from '@/lib/storage';
import type { GardenCell, DecorationKey } from '@/lib/types';

const DECO_EMOJI: Record<DecorationKey, string> = {
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

const DECO_KEYS: DecorationKey[] = ['cactus', 'rock', 'flower', 'bench'];

function isWater(row: number, col: number) {
  return row === 0 || row === 15 || col === 0 || col === 15;
}

/** Sprite image with emoji fallback. */
function DecoSprite({ deco }: { deco: DecorationKey }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="text-base leading-none">{DECO_EMOJI[deco]}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/sprites/${deco}.png`}
      alt={deco}
      width={28}
      height={28}
      onError={() => setFailed(true)}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function GardenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pendingDeco = searchParams.get('decoration') as DecorationKey | null;
  const pendingTaskId = searchParams.get('taskId');

  const [garden, setGarden] = useState<GardenCell[]>([]);
  const [user, setUser] = useState<{ nickname: string; avatarId: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = loadData();
    if (!data.user) {
      router.replace('/');
      return;
    }
    setUser(data.user);
    setGarden(data.garden);
  }, [router]);

  if (!mounted || !user) return null;

  function handleCellClick(row: number, col: number) {
    if (!pendingDeco || justPlaced) return;
    if (isWater(row, col)) return;
    if (garden.some(c => c.x === col && c.y === row)) return;

    const cell: GardenCell = { x: col, y: row, decoration: pendingDeco };
    placeDecoration(cell);
    if (pendingTaskId) updateTask(pendingTaskId, { planted: true });

    setGarden(prev => [...prev, cell]);
    setJustPlaced(true);
    setTimeout(() => router.push('/tasks'), 900);
  }

  function cellAt(row: number, col: number) {
    return garden.find(c => c.x === col && c.y === row);
  }

  const decoCount = (d: DecorationKey) => garden.filter(c => c.decoration === d).length;

  return (
    <main className="max-w-3xl mx-auto p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-pixel text-sm text-green-800">Pixel Garden</h1>
          {pendingDeco && !justPlaced ? (
            <p className="text-xs text-amber-600 mt-1">
              Click a grass tile to plant {DECO_EMOJI[pendingDeco]}
            </p>
          ) : (
            <p className="text-xs text-stone-400 mt-1">your garden</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border-2 border-stone-200 rounded-xl px-3 py-2">
            <span className="text-lg leading-none">{AVATAR_EMOJI[user.avatarId]}</span>
            <span className="text-xs font-medium text-stone-700">{user.nickname}</span>
          </div>
          <button
            onClick={() => router.push('/tasks')}
            className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-xl transition-colors"
          >
            ← Tasks
          </button>
        </div>
      </div>

      {/* Status banners */}
      {justPlaced && (
        <div className="bg-green-100 border-2 border-green-300 text-green-700 text-sm px-4 py-2.5 rounded-xl mb-4 text-center font-mono">
          🌿 Planted! Heading back…
        </div>
      )}
      {pendingDeco && !justPlaced && (
        <div className="bg-amber-50 border-2 border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
          <span className="text-xl">{DECO_EMOJI[pendingDeco]}</span>
          <span>
            Click any green tile to place your <strong>{pendingDeco}</strong>
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto mb-4">
        <div
          className="inline-grid border-2 border-stone-400 rounded-sm"
          style={{ gridTemplateColumns: 'repeat(16, 36px)' }}
        >
          {Array.from({ length: 256 }, (_, i) => {
            const row = Math.floor(i / 16);
            const col = i % 16;
            const water = isWater(row, col);
            const cell = cellAt(row, col);
            const canPlace = !water && !cell && !!pendingDeco && !justPlaced;

            return (
              <div
                key={i}
                onClick={() => canPlace && handleCellClick(row, col)}
                title={water ? '~' : cell ? cell.decoration : '.'}
                className={[
                  'w-9 h-9 flex items-center justify-center border border-opacity-30 select-none',
                  water
                    ? 'bg-blue-300 border-blue-400 cursor-default'
                    : cell
                    ? 'bg-green-300 border-green-400 cursor-default'
                    : canPlace
                    ? 'bg-green-200 border-green-300 cursor-pointer hover:bg-green-400 active:bg-green-500 transition-colors'
                    : 'bg-green-200 border-green-300 cursor-default',
                ].join(' ')}
              >
                {water ? (
                  <span className="text-blue-500 text-xs opacity-60 font-mono">~</span>
                ) : cell ? (
                  <DecoSprite deco={cell.decoration} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 items-center">
        {DECO_KEYS.map(d => (
          <div
            key={d}
            className="bg-white border border-stone-200 rounded-lg px-3 py-1 text-xs text-stone-600 flex items-center gap-1.5"
          >
            <span>{DECO_EMOJI[d]}</span>
            <span className="font-mono">{decoCount(d)}×</span>
          </div>
        ))}
        <div className="bg-white border border-stone-200 rounded-lg px-3 py-1 text-xs text-stone-400 font-mono">
          {garden.length} planted total
        </div>
      </div>
    </main>
  );
}

export default function GardenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-stone-400 font-mono text-sm">
          Loading garden…
        </div>
      }
    >
      <GardenContent />
    </Suspense>
  );
}
