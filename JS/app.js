/* ===== To-Do List Dashboard — app.js ===== */
'use strict';

const $ = id => document.getElementById(id);

/* ---------- clock & greeting ---------- */
let userName = '';

function greet() {
  const h = new Date().getHours();
  const g = h < 5 ? 'Selamat Malam' : h < 12 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 19 ? 'Selamat Sore' : 'Selamat Malam';
  $('greeting').textContent = g + (userName ? ', ' + userName : '');
}

function tick() {
  const d = new Date();
  $('clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  $('date').textContent = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  greet();
}
tick(); setInterval(tick, 1000);

/* Name form */
const nameForm = $('name-form');
const resetNameBtn = $('reset-name');

function hideNameForm() {
  nameForm.classList.add('hidden');
  resetNameBtn.classList.remove('hidden');
}

function showNameForm() {
  nameForm.classList.remove('hidden');
  resetNameBtn.classList.add('hidden');
  $('name-input').value = '';
  $('name-input').focus();
}

nameForm.addEventListener('submit', e => {
  e.preventDefault();
  const val = $('name-input').value.trim();
  if (!val) return;
  userName = val;
  try { localStorage.setItem('tld_userName', userName); } catch (_) {}
  greet();
  hideNameForm();
});

resetNameBtn.addEventListener('click', () => {
  userName = '';
  try { localStorage.removeItem('tld_userName'); } catch (_) {}
  greet();
  showNameForm();
});

try {
  const saved = localStorage.getItem('tld_userName');
  if (saved) { userName = saved; greet(); hideNameForm(); }
} catch (_) {}

/* ---------- theme ---------- */
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t === 'night' ? 'dark' : 'light');
  document.querySelectorAll('.theme-switch button').forEach(b => {
    b.classList.toggle('active', b.dataset.t === t);
  });
  try { localStorage.setItem('tld_theme', t); } catch (_) {}
}

let savedTheme = 'day';
try { savedTheme = localStorage.getItem('tld_theme') || 'day'; } catch (_) {}
setTheme(savedTheme);

document.querySelectorAll('.theme-switch button').forEach(b => {
  b.addEventListener('click', () => setTheme(b.dataset.t));
});

/* ---------- timer ---------- */
let total = 25 * 60, left = total, iv = null;

function formatTime(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function showTimer() {
  $('timer-display').textContent = formatTime(left);
  $('bar-fill').style.width = (left / total * 100) + '%';
}

function haltTimer(label) {
  clearInterval(iv); iv = null;
  $('timer-start-stop').textContent = label;
}

function resetTimer() {
  haltTimer('Start');
  left = total;
  $('timer-status').textContent = 'READY';
  showTimer();
}

$('timer-start-stop').addEventListener('click', () => {
  if (iv) {
    haltTimer('Resume');
    $('timer-status').textContent = 'PAUSED';
    return;
  }
  if (left <= 0) left = total;
  $('timer-start-stop').textContent = 'Pause';
  $('timer-status').textContent = 'FOCUSING\u2026';
  iv = setInterval(() => {
    left--;
    showTimer();
    if (left <= 0) { haltTimer('Start'); $('timer-status').textContent = 'TIME\u2019S UP! \uD83C\uDF89'; }
  }, 1000);
});

$('timer-reset').addEventListener('click', resetTimer);

function pickMode(m) {
  document.querySelectorAll('.mode').forEach(x => x.classList.toggle('active', +x.dataset.min === m));
  $('duration-input').value = m;
  total = m * 60;
  resetTimer();
}
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => pickMode(+b.dataset.min)));

$('duration-save').addEventListener('click', () => {
  const v = parseInt($('duration-input').value) || 25;
  const clamped = Math.min(180, Math.max(1, v));
  const errorEl = $('duration-error');
  if (v < 1 || v > 180) {
    errorEl.textContent = 'Duration must be between 1 and 180.';
    return;
  }
  errorEl.textContent = '';
  pickMode(clamped);
});

showTimer();

/* ---------- tasks ---------- */
let tasks = [];
let pending = '';

try {
  const saved = JSON.parse(localStorage.getItem('tld_tasks') || '[]');
  if (Array.isArray(saved)) tasks = saved;
} catch (_) {}

function saveTasks() {
  try { localStorage.setItem('tld_tasks', JSON.stringify(tasks)); } catch (_) {}
}

function renderTasks() {
  const sort = $('sort-select').value;
  const arr = [...tasks];
  if (sort === 'az') arr.sort((a, b) => a.t.localeCompare(b.t));
  else arr.sort((a, b) => b.id - a.id);

  $('task-list').innerHTML = '';
  arr.forEach(x => {
    const li = document.createElement('li');
    li.className = x.done ? 'done' : '';

    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = x.done;
    cb.addEventListener('change', () => { x.done = cb.checked; saveTasks(); renderTasks(); });

    const sp = document.createElement('span');
    sp.textContent = x.t;

    const del = document.createElement('button');
    del.className = 'delete'; del.textContent = 'Delete';
    del.addEventListener('click', () => { tasks = tasks.filter(y => y !== x); saveTasks(); renderTasks(); });

    li.append(cb, sp, del);
    $('task-list').append(li);
  });
}

function addTask(t) {
  tasks.push({ id: Date.now(), t, done: false });
  $('task-input').value = '';
  $('duplicate-warning').hidden = true;
  saveTasks();
  renderTasks();
}

$('addTask').addEventListener('click', () => {
  const t = $('task-input').value.trim();
  const errorEl = $('task-error');
  errorEl.textContent = '';
  if (!t) { errorEl.textContent = 'Task description is required.'; return; }
  if (tasks.some(x => x.t.toLowerCase() === t.toLowerCase())) {
    pending = t;
    $('duplicate-warning').hidden = false;
  } else {
    addTask(t);
  }
});

$('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('addTask').click(); }
});

$('duplicate-confirm').addEventListener('click', () => addTask(pending));
$('duplicate-cancel').addEventListener('click', () => { $('duplicate-warning').hidden = true; });
$('sort-select').addEventListener('change', renderTasks);
renderTasks();

/* ---------- quick links ---------- */
let links = [];

try {
  const saved = JSON.parse(localStorage.getItem('tld_links') || '[]');
  if (Array.isArray(saved)) links = saved;
} catch (_) {}

function saveLinks() {
  try { localStorage.setItem('tld_links', JSON.stringify(links)); } catch (_) {}
}

function renderLinks() {
  const container = $('links-container');
  container.innerHTML = '';
  links.forEach(lk => {
    const row = document.createElement('div');
    row.className = 'link-row';
    const a = document.createElement('a');
    a.href = lk.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = lk.label || lk.url;
    const del = document.createElement('button');
    del.className = 'link-del'; del.textContent = '\u00D7';
    del.addEventListener('click', () => { links = links.filter(x => x !== lk); saveLinks(); renderLinks(); });
    row.append(a, del);
    container.append(row);
  });
}

$('addLink').addEventListener('click', () => {
  const u = $('link-url-input').value.trim();
  const errorEl = $('link-error');
  errorEl.textContent = '';
  if (!/^https?:\/\/\S+/i.test(u)) {
    errorEl.textContent = 'Please enter a valid URL starting with http:// or https://.';
    return;
  }
  if (links.length >= 20) {
    errorEl.textContent = 'Maximum of 20 shortcuts reached.';
    return;
  }
  links.push({ url: u, label: $('link-label-input').value.trim().slice(0, 50) });
  $('link-url-input').value = ''; $('link-label-input').value = '';
  saveLinks(); renderLinks();
});

renderLinks();

