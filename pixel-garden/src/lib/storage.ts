import type { AppData, Task, GardenCell, User, DecorationKey } from './types';

const STORAGE_KEY = 'pixel-garden-v1';

const empty = (): AppData => ({ user: null, tasks: [], garden: [] });

export function loadData(): AppData {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<AppData>;
    return { user: p.user ?? null, tasks: p.tasks ?? [], garden: p.garden ?? [] };
  } catch {
    return empty();
  }
}

function save(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function setUser(user: User): void {
  save({ ...loadData(), user });
}

export function addTask(task: Task): void {
  const d = loadData();
  save({ ...d, tasks: [...d.tasks, task] });
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const d = loadData();
  save({ ...d, tasks: d.tasks.map(t => (t.id === id ? { ...t, ...updates } : t)) });
}

export function placeDecoration(cell: GardenCell): void {
  const d = loadData();
  if (d.garden.some(c => c.x === cell.x && c.y === cell.y)) return;
  save({ ...d, garden: [...d.garden, cell] });
}

const DECO_CYCLE: DecorationKey[] = ['cactus', 'rock', 'flower', 'bench'];

const KEYWORDS: [string[], DecorationKey][] = [
  [['wash', 'laundry', 'clean', 'water', 'dishes', 'shower', 'swim'], 'cactus'],
  [['rock', 'stone', 'lift', 'gym', 'run', 'walk', 'jog', 'exercise', 'heavy'], 'rock'],
  [['flower', 'garden', 'plant', 'grow', 'read', 'study', 'learn', 'draw', 'paint'], 'flower'],
  [['bench', 'sit', 'rest', 'break', 'cook', 'eat', 'food', 'lunch', 'dinner'], 'bench'],
];

export function assignDecoration(title: string, taskCount: number): DecorationKey {
  const lower = title.toLowerCase();
  for (const [words, deco] of KEYWORDS) {
    if (words.some(w => lower.includes(w))) return deco;
  }
  return DECO_CYCLE[taskCount % 4];
}
