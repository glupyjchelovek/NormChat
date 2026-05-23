/* ════════════════════════════════════════
   NormChat — app.js
   Real-time chat powered by Supabase
   ════════════════════════════════════════ */

// ── Supabase config ──────────────────────
const SUPABASE_URL  = 'https://mglzaxlqzgurdpnkbilb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nbHpheGxxemd1cmRwbmtiaWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzUzOTksImV4cCI6MjA5NTExMTM5OX0.XDr5DBZ5M2JY-Fg40yE-yjuTvrTcQnzicT_cwuyWdhk';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Constants ─────────────────────────────
const BOT_USERNAME     = 'Иван';
const BOT_AVATAR_IMG   = '/assets/ivan.png';
const BOT_THINKING_DELAY = 800;
const BOT_THINKING_MAX   = 12000;
const TYPING_TIMEOUT     = 2500;

// 12 photo avatars — user uploads these to /assets/
const AVATARS = [
  '/assets/av1.png',  '/assets/av2.png',  '/assets/av3.png',
  '/assets/av4.png',  '/assets/av5.png',  '/assets/av6.png',
  '/assets/av7.png',  '/assets/av8.png',  '/assets/av9.png',
  '/assets/av10.png', '/assets/av11.png', '/assets/av12.png',
];

// Fallback colors if image fails to load
const AVATAR_COLORS = [
  '#f5576c','#f093fb','#667eea','#11998e',
  '#f7971e','#764ba2','#fd746c','#2196f3',
  '#4caf50','#ff9800','#e91e63','#00bcd4',
];

const EMOJI_PACK = [
  '😀','😂','🥰','😎','🤩','😜','🤔','😴',
  '👍','👏','🙌','🤝','❤️','🔥','⭐','✨',
  '🎉','🎊','🎮','💬','💡','🚀','🌈','🌙',
  '🍕','🍔','🎂','☕','🍦','🍿','🎵','🎶',
];

// ── Music ─────────────────────────────────
const MUSIC_YT_ID = '6SEr1XcZG4M'; // EMIN feat. JONY — Камин

// ── State ─────────────────────────────────
let user           = null;
let channel        = null;
let typingTimer    = null;
let isTyping       = false;
let typingUsers    = {};
let emojiPickerOpen = false;
let botThinkingTimer = null;
let botThinkingEl    = null;
let musicPlaying     = false;
let selectedAvatar   = null;

// ── DOM refs ──────────────────────────────
const welcomeScreen   = document.getElementById('welcome-screen');
const chatScreen      = document.getElementById('chat-screen');
const nameInput       = document.getElementById('name-input');
const avatarGrid      = document.getElementById('avatar-grid');
const joinBtn         = document.getElementById('join-btn');
const welcomeError    = document.getElementById('welcome-error');
const messagesInner   = document.getElementById('messages-inner');
const messagesArea    = document.getElementById('messages-area');
const msgInput        = document.getElementById('msg-input');
const sendBtn         = document.getElementById('send-btn');
const emojiBtn        = document.getElementById('emoji-btn');
const emojiPicker     = document.getElementById('emoji-picker');
const typingIndicator = document.getElementById('typing-indicator');
const typingText      = document.getElementById('typing-text');
const onlineStatus    = document.getElementById('online-status');
const myAvatarBadge   = document.getElementById('my-avatar-badge');
const myNameDisplay   = document.getElementById('my-name-display');
const logoutBtn       = document.getElementById('logout-btn');

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
function init() {
  buildAvatarGrid();
  buildEmojiPicker();
  bindWelcomeEvents();
  bindMusicEvents();
  bindOnlinePanelEvents();
  checkExistingUser();
}

// ── Build photo avatar grid ────────────────
function buildAvatarGrid() {
  AVATARS.forEach((src, i) => {
    const btn = document.createElement('button');
    btn.className  = 'avatar-option';
    btn.type       = 'button';

    const img = document.createElement('img');
    img.src      = src;
    img.alt      = `Avatar ${i + 1}`;
    img.draggable = false;
    img.onerror  = () => {
      img.style.display = 'none';
      btn.textContent   = (i + 1).toString();
      btn.style.background = AVATAR_COLORS[i];
      btn.style.color      = '#fff';
      btn.style.fontSize   = '18px';
      btn.style.fontWeight = '700';
    };
    btn.appendChild(img);
    btn.addEventListener('click', () => selectAvatar(btn, src));
    avatarGrid.appendChild(btn);
  });
}

function selectAvatar(btn, src) {
  document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAvatar = src;
  validateForm();
}

// ── Build emoji picker ─────────────────────
function buildEmojiPicker() {
  EMOJI_PACK.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className   = 'emoji-pick-btn';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      insertAtCursor(msgInput, emoji);
      autoResize(msgInput);
      closeEmojiPicker();
      msgInput.focus();
    });
    emojiPicker.appendChild(btn);
  });
}

// ── Welcome form ───────────────────────────
function bindWelcomeEvents() {
  nameInput.addEventListener('input', validateForm);
  joinBtn.addEventListener('click', handleJoin);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleJoin(); });
}

function validateForm() {
  joinBtn.disabled = !(nameInput.value.trim().length >= 1 && selectedAvatar !== null);
}

function checkExistingUser() {
  const saved = localStorage.getItem('normchat_user');
  if (saved) {
    try { user = JSON.parse(saved); showChat(); }
    catch { localStorage.removeItem('normchat_user'); }
  }
}

async function handleJoin() {
  const name = nameInput.value.trim();
  if (!name || !selectedAvatar) { welcomeError.classList.remove('hidden'); return; }
  welcomeError.classList.add('hidden');
  user = { username: name, avatar: selectedAvatar };
  localStorage.setItem('normchat_user', JSON.stringify(user));
  burstConfetti();
  await delay(300);
  showChat();
}

// ══════════════════════════════════════════
// CHAT UI
// ══════════════════════════════════════════
function showChat() {
  welcomeScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');

  // Render my avatar badge
  myAvatarBadge.innerHTML = '';
  if (user.avatar && (user.avatar.startsWith('/') || user.avatar.startsWith('http'))) {
    const img = document.createElement('img');
    img.src = user.avatar; img.alt = user.username;
    myAvatarBadge.appendChild(img);
  } else {
    myAvatarBadge.textContent = user.avatar;
  }
  myNameDisplay.textContent = user.username;
  setupChat();
}

function showWelcome() {
  channel && channel.unsubscribe();
  chatScreen.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
  user = null;
  localStorage.removeItem('normchat_user');
  selectedAvatar = null;
  document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
  nameInput.value = '';
  validateForm();
}

async function setupChat() {
  onlineStatus.textContent = 'Connecting…';
  onlineStatus.className   = 'header-status';
  await loadMessages();
  subscribeRealtime();
  bindChatEvents();
}

// ── Load history ───────────────────────────
async function loadMessages() {
  const { data, error } = await db
    .from('messages').select('*')
    .order('created_at', { ascending: true }).limit(120);

  if (error) { console.error('Load error:', error); return; }

  const divider = messagesInner.querySelector('.chat-day-divider');
  messagesInner.innerHTML = '';
  if (divider) messagesInner.appendChild(divider);

  if (!data || data.length === 0) appendEmptyState();
  else data.forEach(msg => renderMessage(msg));

  scrollToBottom(false);
}

// ── Realtime subscription ──────────────────
function subscribeRealtime() {
  channel = db.channel('normchat-global', {
    config: {
      broadcast: { self: false },
      presence:  { key: user.username },
    }
  });

  channel
    // New messages
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, payload => {
      const msg = payload.new;
      if (msg.username === BOT_USERNAME) hideBotThinking();

      // Skip re-rendering own optimistic messages
      if (msg.username === user.username) {
        const opt = document.querySelector('[data-id^="opt-"]');
        if (opt) { opt.dataset.id = msg.id; return; }
      }

      removeEmptyState();
      renderMessage(msg);
      scrollToBottom(true);

      if (msg.username !== BOT_USERNAME) showBotThinkingAfterDelay();
    })
    // Typing broadcast
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.username !== user.username) handleTypingEvent(payload.username);
    })
    // Presence — who's online
    .on('presence', { event: 'sync' }, () => updateOnlineUsers())
    .on('presence', { event: 'join' }, () => updateOnlineUsers())
    .on('presence', { event: 'leave' }, () => updateOnlineUsers())

    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        onlineStatus.textContent = '🟢 Online';
        onlineStatus.classList.add('online');
        // Announce presence
        channel.track({
          username:  user.username,
          avatar:    user.avatar,
          online_at: new Date().toISOString(),
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onlineStatus.textContent = '🔴 Disconnected';
        onlineStatus.classList.remove('online');
      }
    });
}

// ── Online users ───────────────────────────
function updateOnlineUsers() {
  if (!channel) return;
  const state = channel.presenceState();
  const users = Object.values(state).flat();

  const countBadge   = document.getElementById('online-count-badge');
  const panelCount   = document.getElementById('online-panel-count');
  const list         = document.getElementById('online-list');

  if (countBadge) countBadge.textContent = users.length;
  if (panelCount) panelCount.textContent = users.length;

  if (!list) return;
  list.innerHTML = '';

  users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'online-user-item';

    const av = document.createElement('div');
    av.className = 'online-user-avatar';
    if (u.avatar && (u.avatar.startsWith('/') || u.avatar.startsWith('http'))) {
      const img = document.createElement('img');
      img.src = u.avatar; img.alt = u.username;
      av.appendChild(img);
    } else {
      av.textContent = u.avatar || '?';
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'online-user-name';
    nameEl.textContent = u.username === user.username
      ? u.username + ' (you)' : u.username;
    if (u.username === user.username) nameEl.style.opacity = '0.6';

    item.appendChild(av);
    item.appendChild(nameEl);
    list.appendChild(item);
  });
}

function bindOnlinePanelEvents() {
  const toggleBtn  = document.getElementById('online-toggle-btn');
  const panel      = document.getElementById('online-panel');
  const closeBtn   = document.getElementById('online-close-btn');
  const backdrop   = document.getElementById('panel-backdrop');

  function openPanel()  {
    panel.classList.add('open');
    backdrop.classList.remove('hidden');
  }
  function closePanel() {
    panel.classList.remove('open');
    backdrop.classList.add('hidden');
  }

  toggleBtn && toggleBtn.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  closeBtn  && closeBtn.addEventListener('click',  closePanel);
  backdrop  && backdrop.addEventListener('click',   closePanel);
}

// ── Music player ───────────────────────────
function bindMusicEvents() {
  const fab     = document.getElementById('music-fab');
  const card    = document.getElementById('music-player-card');
  const closeEl = document.getElementById('music-card-close');
  const iframe  = document.getElementById('music-iframe');

  function openMusic() {
    card.classList.remove('hidden');
    iframe.src = `https://www.youtube.com/embed/${MUSIC_YT_ID}?autoplay=1&rel=0`;
    musicPlaying = true;
    fab.classList.add('playing');
    fab.title = 'Stop music';
  }

  function closeMusic() {
    card.classList.add('hidden');
    iframe.src = '';
    musicPlaying = false;
    fab.classList.remove('playing');
    fab.title = 'В камине в 6 утра 🎵';
  }

  fab   && fab.addEventListener('click',   () => musicPlaying ? closeMusic() : openMusic());
  closeEl && closeEl.addEventListener('click', closeMusic);
}

// ── Bot thinking animation ─────────────────
function showBotThinkingAfterDelay() {
  clearTimeout(botThinkingTimer);
  botThinkingTimer = setTimeout(() => {
    hideBotThinking();
    botThinkingEl = document.createElement('div');
    botThinkingEl.className = 'bot-thinking';
    botThinkingEl.id        = 'bot-thinking';
    botThinkingEl.innerHTML = `
      <div class="bt-avatar"><img src="${BOT_AVATAR_IMG}" alt="Иван" /></div>
      <div class="bt-bubble">
        <div class="bt-dot"></div><div class="bt-dot"></div><div class="bt-dot"></div>
      </div>`;
    messagesInner.appendChild(botThinkingEl);
    scrollToBottom(true);
    clearTimeout(botThinkingTimer);
    botThinkingTimer = setTimeout(hideBotThinking, BOT_THINKING_MAX);
  }, BOT_THINKING_DELAY);
}

function hideBotThinking() {
  clearTimeout(botThinkingTimer);
  if (botThinkingEl) { botThinkingEl.remove(); botThinkingEl = null; }
  const el = document.getElementById('bot-thinking');
  if (el) el.remove();
}

// ── Render a single message ────────────────
function renderMessage(msg) {
  const isMine = msg.username === user.username;
  const isBot  = msg.username === BOT_USERNAME;
  const isEmojiOnly = isOnlyEmoji(msg.content);

  const row = document.createElement('div');
  row.className  = ['msg-row', isMine ? 'mine' : '', isBot ? 'bot-msg' : ''].filter(Boolean).join(' ');
  row.dataset.id = msg.id;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  if (msg.avatar && (msg.avatar.startsWith('/') || msg.avatar.startsWith('http'))) {
    const img = document.createElement('img');
    img.src = msg.avatar; img.alt = msg.username;
    avatar.appendChild(img);
  } else {
    avatar.textContent = msg.avatar;
  }

  const group = document.createElement('div');
  group.className = 'msg-group';

  // Username label (not shown for own messages)
  if (!isMine) {
    const uname = document.createElement('div');
    uname.className = 'msg-username';
    if (isBot) {
      uname.innerHTML = `${msg.username} <span class="bot-badge">AI</span>`;
    } else {
      uname.textContent = msg.username;
    }
    group.appendChild(uname);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble' + (isEmojiOnly ? ' emoji-only' : '');
  bubble.textContent = msg.content;

  const time = document.createElement('div');
  time.className   = 'msg-time';
  time.textContent = formatTime(msg.created_at);

  group.appendChild(bubble);
  group.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(group);
  messagesInner.appendChild(row);
}

// ── Empty state ────────────────────────────
function appendEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state'; div.id = 'empty-state';
  div.innerHTML = `<div class="empty-icon">💬</div><p>No messages yet!</p><small>Be the first to say something ✨</small>`;
  messagesInner.appendChild(div);
}
function removeEmptyState() {
  const el = document.getElementById('empty-state');
  if (el) el.remove();
}

// ── Typing indicator ───────────────────────
function handleTypingEvent(username) {
  if (typingUsers[username]) clearTimeout(typingUsers[username]);
  typingUsers[username] = setTimeout(() => { delete typingUsers[username]; updateTypingUI(); }, TYPING_TIMEOUT + 200);
  updateTypingUI();
}
function updateTypingUI() {
  const names = Object.keys(typingUsers);
  if (names.length === 0) { typingIndicator.classList.add('hidden'); return; }
  let text = names.length === 1 ? names[0] + ' is typing'
           : names.length === 2 ? names.join(' & ') + ' are typing'
           : 'Several people are typing';
  typingText.textContent = text;
  typingIndicator.classList.remove('hidden');
}

// ── Chat input events ──────────────────────
function bindChatEvents() {
  sendBtn.addEventListener('click', sendMessage);
  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  msgInput.addEventListener('input', () => { autoResize(msgInput); handleTypingBroadcast(); });
  emojiBtn.addEventListener('click', toggleEmojiPicker);
  document.addEventListener('click', e => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) closeEmojiPicker();
  });
  logoutBtn.addEventListener('click', showWelcome);
}

async function sendMessage() {
  const content = msgInput.value.trim();
  if (!content) return;

  msgInput.value = '';
  autoResize(msgInput);
  stopTyping();

  const optimistic = {
    id: 'opt-' + Date.now(),
    created_at: new Date().toISOString(),
    username: user.username,
    avatar:   user.avatar,
    content,
  };
  removeEmptyState();
  renderMessage(optimistic);
  scrollToBottom(true);
  showBotThinkingAfterDelay();

  const { error } = await db.from('messages').insert({
    username: user.username,
    avatar:   user.avatar,
    content,
  });

  if (error) {
    console.error('Send error:', error);
    hideBotThinking();
    const el = document.querySelector(`[data-id="${optimistic.id}"]`);
    if (el) el.remove();
    alert('Message failed to send. Please try again.');
  }
}

function handleTypingBroadcast() {
  if (!isTyping) { isTyping = true; broadcastTyping(); }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, TYPING_TIMEOUT);
}
function stopTyping()     { isTyping = false; clearTimeout(typingTimer); }
function broadcastTyping() {
  if (!channel) return;
  channel.send({ type: 'broadcast', event: 'typing', payload: { username: user.username } });
}

function toggleEmojiPicker() { emojiPickerOpen = !emojiPickerOpen; emojiPicker.classList.toggle('hidden', !emojiPickerOpen); }
function closeEmojiPicker()  { emojiPickerOpen = false; emojiPicker.classList.add('hidden'); }

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function scrollToBottom(smooth) {
  messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
function insertAtCursor(el, text) {
  const s = el.selectionStart, e = el.selectionEnd;
  el.value = el.value.slice(0, s) + text + el.value.slice(e);
  el.selectionStart = el.selectionEnd = s + text.length;
}
function isOnlyEmoji(str) {
  const r = /^(\p{Emoji_Presentation}|\p{Emoji}️|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\s)+$/u;
  return r.test(str.trim()) && str.trim().length <= 8;
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Confetti ───────────────────────────────
function burstConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#667eea','#f093fb','#f5576c','#ffd700','#86efac','#60a5fa'];
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${0.8+Math.random()*0.8}s;animation-delay:${Math.random()*0.4}s;
      transform:rotate(${Math.random()*360}deg);width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};`;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 2000);
}

// ── Start ──────────────────────────────────
init();
