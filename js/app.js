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
const BOT_USERNAME = 'NormBot';   // must match edge function exactly
const BOT_THINKING_DELAY = 800;   // ms before showing "thinking" bubble
const BOT_THINKING_MAX   = 12000; // ms max before hiding thinking bubble

const AVATARS = [
  '🐱','🐶','🦊','🐼','🐻','🦁','🐸','🐙',
  '🦄','🐝','🦋','🐧','🦖','🐳','🦈','🐨',
  '🦋','🌸','🌈','🦔',
];

const EMOJI_PACK = [
  '😀','😂','🥰','😎','🤩','😜','🤔','😴',
  '👍','👏','🙌','🤝','❤️','🔥','⭐','✨',
  '🎉','🎊','🎮','💬','💡','🚀','🌈','🌙',
  '🍕','🍔','🎂','☕','🍦','🍿','🎵','🎶',
];

const TYPING_TIMEOUT = 2500; // ms

// ── State ─────────────────────────────────
let user = null;           // { username, avatar }
let channel = null;        // Supabase Realtime channel
let typingTimer = null;
let isTyping = false;
let typingUsers = {};      // { username: timeoutId }
let emojiPickerOpen = false;
let botThinkingTimer = null;
let botThinkingEl = null;

// ── DOM refs ──────────────────────────────
const welcomeScreen  = document.getElementById('welcome-screen');
const chatScreen     = document.getElementById('chat-screen');
const nameInput      = document.getElementById('name-input');
const avatarGrid     = document.getElementById('avatar-grid');
const joinBtn        = document.getElementById('join-btn');
const welcomeError   = document.getElementById('welcome-error');
const messagesInner  = document.getElementById('messages-inner');
const messagesArea   = document.getElementById('messages-area');
const msgInput       = document.getElementById('msg-input');
const sendBtn        = document.getElementById('send-btn');
const emojiBtn       = document.getElementById('emoji-btn');
const emojiPicker    = document.getElementById('emoji-picker');
const typingIndicator= document.getElementById('typing-indicator');
const typingText     = document.getElementById('typing-text');
const onlineStatus   = document.getElementById('online-status');
const myAvatarDisplay= document.getElementById('my-avatar-display');
const myNameDisplay  = document.getElementById('my-name-display');
const logoutBtn      = document.getElementById('logout-btn');

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
function init() {
  buildAvatarGrid();
  buildEmojiPicker();
  bindWelcomeEvents();
  checkExistingUser();
}

// ── Build avatar grid ──────────────────────
let selectedAvatar = null;

function buildAvatarGrid() {
  AVATARS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'avatar-option';
    btn.textContent = emoji;
    btn.title = emoji;
    btn.addEventListener('click', () => selectAvatar(btn, emoji));
    avatarGrid.appendChild(btn);
  });
}

function selectAvatar(btn, emoji) {
  document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAvatar = emoji;
  validateForm();
}

// ── Build emoji picker ─────────────────────
function buildEmojiPicker() {
  EMOJI_PACK.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-pick-btn';
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

// ── Welcome form events ────────────────────
function bindWelcomeEvents() {
  nameInput.addEventListener('input', validateForm);
  joinBtn.addEventListener('click', handleJoin);
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleJoin();
  });
}

function validateForm() {
  const valid = nameInput.value.trim().length >= 1 && selectedAvatar !== null;
  joinBtn.disabled = !valid;
}

function checkExistingUser() {
  const saved = localStorage.getItem('normchat_user');
  if (saved) {
    try {
      user = JSON.parse(saved);
      showChat();
    } catch { localStorage.removeItem('normchat_user'); }
  }
}

async function handleJoin() {
  const name = nameInput.value.trim();
  if (!name || !selectedAvatar) {
    welcomeError.classList.remove('hidden');
    return;
  }
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

  myAvatarDisplay.textContent = user.avatar;
  myNameDisplay.textContent   = user.username;

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

  // Load history
  await loadMessages();

  // Real-time subscription
  subscribeRealtime();

  // Chat input events
  bindChatEvents();
}

// ── Load message history ───────────────────
async function loadMessages() {
  const { data, error } = await db
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(120);

  if (error) {
    console.error('Load error:', error);
    return;
  }

  // Clear existing (except day divider)
  const divider = messagesInner.querySelector('.chat-day-divider');
  messagesInner.innerHTML = '';
  if (divider) messagesInner.appendChild(divider);

  if (!data || data.length === 0) {
    appendEmptyState();
  } else {
    data.forEach(msg => renderMessage(msg));
  }

  scrollToBottom(false);
}

// ── Realtime subscription ──────────────────
function subscribeRealtime() {
  channel = db.channel('normchat-global', {
    config: { broadcast: { self: false } }
  });

  channel
    // New message via DB
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, payload => {
      const msg = payload.new;

      // Hide bot thinking bubble when bot message arrives
      if (msg.username === BOT_USERNAME) {
        hideBotThinking();
      }

      // Don't double-render optimistic messages from self
      if (msg.username === user.username) {
        const opt = document.querySelector('[data-id^="opt-"]');
        if (opt) { opt.dataset.id = msg.id; return; }
      }

      removeEmptyState();
      renderMessage(msg);
      scrollToBottom(true);

      // Show bot thinking animation after non-bot messages
      if (msg.username !== BOT_USERNAME) {
        showBotThinkingAfterDelay();
      }
    })
    // Typing broadcast
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.username !== user.username) {
        handleTypingEvent(payload.username);
      }
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        onlineStatus.textContent = '🟢 Online';
        onlineStatus.classList.add('online');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onlineStatus.textContent = '🔴 Disconnected';
        onlineStatus.classList.remove('online');
      }
    });
}

// ── Bot thinking animation ─────────────────
function showBotThinkingAfterDelay() {
  clearTimeout(botThinkingTimer);
  botThinkingTimer = setTimeout(() => {
    hideBotThinking(); // remove any existing one first
    botThinkingEl = document.createElement('div');
    botThinkingEl.className = 'bot-thinking';
    botThinkingEl.id = 'bot-thinking';
    botThinkingEl.innerHTML = `
      <div class="bt-avatar">🤖</div>
      <div class="bt-bubble">
        <div class="bt-dot"></div>
        <div class="bt-dot"></div>
        <div class="bt-dot"></div>
      </div>
    `;
    messagesInner.appendChild(botThinkingEl);
    scrollToBottom(true);

    // Safety timeout — hide if bot never responds
    clearTimeout(botThinkingTimer);
    botThinkingTimer = setTimeout(hideBotThinking, BOT_THINKING_MAX);
  }, BOT_THINKING_DELAY);
}

function hideBotThinking() {
  clearTimeout(botThinkingTimer);
  if (botThinkingEl) {
    botThinkingEl.remove();
    botThinkingEl = null;
  }
  const el = document.getElementById('bot-thinking');
  if (el) el.remove();
}

// ── Render a single message ────────────────
function renderMessage(msg) {
  const isMine = msg.username === user.username;
  const isBot  = msg.username === BOT_USERNAME;
  const isEmojiOnly = isOnlyEmoji(msg.content);

  const row = document.createElement('div');
  const classes = ['msg-row'];
  if (isMine) classes.push('mine');
  if (isBot)  classes.push('bot-msg');
  row.className = classes.join(' ');
  row.dataset.id = msg.id;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = msg.avatar;

  const group = document.createElement('div');
  group.className = 'msg-group';

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
  time.className = 'msg-time';
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
  div.className = 'empty-state';
  div.id = 'empty-state';
  div.innerHTML = `
    <div class="empty-icon">💬</div>
    <p>No messages yet!</p>
    <small>Be the first to say something ✨</small>
  `;
  messagesInner.appendChild(div);
}
function removeEmptyState() {
  const el = document.getElementById('empty-state');
  if (el) el.remove();
}

// ── Typing indicator ───────────────────────
function handleTypingEvent(username) {
  if (typingUsers[username]) clearTimeout(typingUsers[username]);
  typingUsers[username] = setTimeout(() => {
    delete typingUsers[username];
    updateTypingUI();
  }, TYPING_TIMEOUT + 200);
  updateTypingUI();
}

function updateTypingUI() {
  const names = Object.keys(typingUsers);
  if (names.length === 0) {
    typingIndicator.classList.add('hidden');
    return;
  }
  let text;
  if (names.length === 1) text = names[0] + ' is typing';
  else if (names.length === 2) text = names.join(' & ') + ' are typing';
  else text = 'Several people are typing';
  typingText.textContent = text;
  typingIndicator.classList.remove('hidden');
}

// ── Chat input events ──────────────────────
function bindChatEvents() {
  sendBtn.addEventListener('click', sendMessage);

  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  msgInput.addEventListener('input', () => {
    autoResize(msgInput);
    handleTypingBroadcast();
  });

  emojiBtn.addEventListener('click', toggleEmojiPicker);
  document.addEventListener('click', e => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
      closeEmojiPicker();
    }
  });

  logoutBtn.addEventListener('click', showWelcome);
}

async function sendMessage() {
  const content = msgInput.value.trim();
  if (!content) return;

  msgInput.value = '';
  autoResize(msgInput);
  stopTyping();

  // Optimistic render
  const optimistic = {
    id: 'opt-' + Date.now(),
    created_at: new Date().toISOString(),
    username: user.username,
    avatar: user.avatar,
    content,
  };
  removeEmptyState();
  renderMessage(optimistic);
  scrollToBottom(true);

  // Show bot thinking right away (user sent, bot will respond)
  showBotThinkingAfterDelay();

  // Insert to Supabase
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
  if (!isTyping) {
    isTyping = true;
    broadcastTyping();
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, TYPING_TIMEOUT);
}

function stopTyping() {
  isTyping = false;
  clearTimeout(typingTimer);
}

function broadcastTyping() {
  if (!channel) return;
  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { username: user.username },
  });
}

// ── Emoji picker toggle ────────────────────
function toggleEmojiPicker() {
  emojiPickerOpen = !emojiPickerOpen;
  emojiPicker.classList.toggle('hidden', !emojiPickerOpen);
}
function closeEmojiPicker() {
  emojiPickerOpen = false;
  emojiPicker.classList.add('hidden');
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

function scrollToBottom(smooth) {
  messagesArea.scrollTo({
    top: messagesArea.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function insertAtCursor(el, text) {
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
}

function isOnlyEmoji(str) {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}️|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\s)+$/u;
  return emojiRegex.test(str.trim()) && str.trim().length <= 8;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Confetti burst ─────────────────────────
function burstConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#667eea','#f093fb','#f5576c','#ffd700','#86efac','#60a5fa'];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${0.8 + Math.random() * 0.8}s;
      animation-delay: ${Math.random() * 0.4}s;
      transform: rotate(${Math.random() * 360}deg);
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 2000);
}

// ── Start ──────────────────────────────────
init();
