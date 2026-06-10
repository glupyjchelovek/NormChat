# Pixel Garden

A cozy pixel garden todo app. Complete tasks to grow your garden! 🌿

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to play

1. **Login** — enter a nickname and pick one of 4 avatars (🌲 🌙 ☀️ 💧)
2. **Tasks** — add tasks on the `/tasks` page; each task is automatically assigned a decoration reward
3. **Complete** — tick the circle to mark a task done; a **Plant it 🌿** button appears
4. **Plant** — click "Plant it" → you're taken to the 16×16 garden map → click any green grass tile
5. **Persist** — refresh the page (F5) → your garden is still there

Everything is stored in `localStorage` under the key `pixel-garden-v1`.

---

## Decoration rewards

| Key | Emoji | Assigned when title contains… |
|---|---|---|
| `cactus` | 🌵 | wash, laundry, clean, water, dishes… |
| `rock` | 🪨 | gym, run, lift, exercise… |
| `flower` | 🌸 | read, study, garden, plant… |
| `bench` | 🪑 | cook, eat, rest, break… |

If no keyword matches, decorations cycle in order.

---

## Custom sprites

Drop pixel art `.png` files into `public/sprites/` to replace the emoji:

```
public/sprites/cactus.png
public/sprites/rock.png
public/sprites/flower.png
public/sprites/bench.png
```

The app loads sprite images first and falls back to emoji if the file is missing.

---

## Map layout

```
~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~   ← row 0  (water, not clickable)
~ . . . . . . . . . . . . . . ~
~ . . . . . . . . . . . . . . ~
       ... grass tiles ...
~ . . . . . . . . . . . . . . ~
~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~   ← row 15 (water, not clickable)
```

Columns 0 and 15 are also water borders. The inner 14×14 = 196 grass tiles are all clickable.

---

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- No backend — localStorage only
