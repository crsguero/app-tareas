// --- Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDEBCJbasCSAH_o6L-VR63LLxoL9IM9BWk",
  authDomain: "app-tareas-f38e5.firebaseapp.com",
  databaseURL: "https://app-tareas-f38e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "app-tareas-f38e5",
  storageBucket: "app-tareas-f38e5.firebasestorage.app",
  messagingSenderId: "991941627960",
  appId: "1:991941627960:web:7a6eeedda963354e3596cd"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.database();
const auth = firebase.auth();

// --- DOM references ---
const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const hoyDetailPanel     = document.getElementById('hoy-detail-panel');
const hoyPanelClose      = document.getElementById('hoy-panel-close');
const hoyPanelTitle      = document.getElementById('hoy-panel-title');
const hoyPanelDate       = document.getElementById('hoy-panel-date');
const hoyPanelRepeat     = document.getElementById('hoy-panel-repeat');
const hoyPanelDeleteBtn  = document.getElementById('hoy-panel-delete-btn');
const hoyMenuBtn         = document.getElementById('hoy-menu-btn');
const hoyMenuDropdown    = document.getElementById('hoy-menu-dropdown');
const hoyPanelDescField       = document.getElementById('hoy-panel-desc-field');
const hoyPanelDescPlaceholder = document.getElementById('hoy-panel-desc-placeholder');
const editSubtasksList   = document.getElementById('edit-subtasks-list');
const editAddSubtask     = document.getElementById('edit-add-subtask');
let hoyActiveLi    = null;
let hoyActivePlanLi = null;

const repeatLabels = { daily: 'Diariamente', weekly: 'Semanalmente', monthly: 'Mensualmente', quarterly: 'Trimestralmente', yearly: 'Anualmente', biannually: 'Cada dos años' };
const weekdayLabels = { '0': 'Domingo', '1': 'Lunes', '2': 'Martes', '3': 'Miércoles', '4': 'Jueves', '5': 'Viernes', '6': 'Sábado' };
const weekdayPlurals = { '0': 'domingos', '1': 'lunes', '2': 'martes', '3': 'miércoles', '4': 'jueves', '5': 'viernes', '6': 'sábados' };

function repeatDisplay(repeat, weekday) {
  if (repeat === 'weekly' && weekday) return `Todos los ${weekdayPlurals[weekday] ?? weekday}`;
  return repeatLabels[repeat] ?? repeat;
}

// --- Sidebar navigation ---

let activeHoyOwner = 'cristina';

function saveNavState() {
  const activeBtn = document.querySelector('.nav-item.active');
  if (activeBtn) {
    localStorage.setItem('nav-state', JSON.stringify({
      view: activeBtn.dataset.view,
      owner: activeBtn.dataset.owner || null
    }));
  }
}

function restoreNavState() {
  const saved = localStorage.getItem('nav-state');
  if (!saved) return;
  let state;
  try { state = JSON.parse(saved); } catch { return; }

  const btn = state.owner
    ? document.querySelector(`.nav-item[data-view="${state.view}"][data-owner="${state.owner}"]`)
    : document.querySelector(`.nav-item[data-view="${state.view}"]`);
  if (!btn) return;

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(v => {
    v.hidden = v.id !== `view-${state.view}`;
  });
  if (state.view === 'hoy' && state.owner) {
    activeHoyOwner = state.owner;
  }
  if (window.innerWidth <= 600) {
    document.getElementById('app-layout').classList.add('mobile-showing-content');
    document.querySelector('meta[name="theme-color"]').content = '#ffffff';
  }
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    closeHoyPanel();
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => {
      v.hidden = v.id !== `view-${target}`;
    });
    if (target === 'hoy' && btn.dataset.owner) {
      activeHoyOwner = btn.dataset.owner;
      filterHoyTasks();
    }
    saveNavState();
    if (window.innerWidth <= 600) {
      document.getElementById('app-layout').classList.add('mobile-showing-content');
      document.querySelector('meta[name="theme-color"]').content = '#ffffff';
    }
  });
});

document.getElementById('mobile-back-btn').addEventListener('click', () => {
  document.getElementById('app-layout').classList.remove('mobile-showing-content');
  document.querySelector('meta[name="theme-color"]').content = '#F9F9FA';
  closeHoyPanel();
});

// --- Completed section ---

const completedSection = document.getElementById('completed-section');
const completedToggle = document.getElementById('completed-toggle');
const completedList = document.getElementById('completed-list');

function visibleCount(list) {
  return Array.from(list.querySelectorAll('.task-item')).filter(li => !li.hidden).length;
}

function updateCompletedSection() {
  const count = visibleCount(completedList);
  completedSection.hidden = count === 0;
  if (count === 0) completedList.hidden = true;
  const open = !completedList.hidden;
  completedToggle.textContent = open
    ? `Ocultar tareas completadas (${count})`
    : `Mostrar tareas completadas (${count})`;
}

function updateNavCounts() {
  const allHoyTasks = [
    ...taskList.querySelectorAll('.task-item'),
    ...completedList.querySelectorAll('.task-item')
  ];
  document.querySelectorAll('.nav-item[data-owner]').forEach(btn => {
    const span = btn.querySelector('.nav-count');
    if (span) span.textContent = allHoyTasks.filter(li => li.dataset.owner === btn.dataset.owner).length;
  });
  const planBtn = document.querySelector('.nav-item[data-view="planificadas"]');
  const planSpan = planBtn?.querySelector('.nav-count');
  if (planSpan) planSpan.textContent = detailTaskList.querySelectorAll('.detail-task-item').length;
}

function filterHoyTasks() {
  [taskList, completedList].forEach(list => {
    list.querySelectorAll('.task-item').forEach(li => {
      li.hidden = li.dataset.owner !== activeHoyOwner;
    });
  });
  completedList.hidden = true;
  updateEmptyState();
  updateCompletedSection();
}

completedToggle.addEventListener('click', () => {
  completedList.hidden = !completedList.hidden;
  updateCompletedSection();
});

document.getElementById('completed-clear').addEventListener('click', () => {
  Array.from(completedList.querySelectorAll('.task-item'))
    .filter(li => li.dataset.owner === activeHoyOwner)
    .forEach(li => li.remove());
  updateEmptyState();
  updateCompletedSection();
  saveTasks();
});

// --- Utilities ---

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (isoDate === today)     return 'Hoy';
  if (isoDate === yesterday) return 'Ayer';
  if (isoDate === tomorrow)  return 'Mañana';
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// --- Persistence (Firebase) ---

function saveTasks() {
  const toObj = (li, done) => ({
    text: li.querySelector('.task-text').textContent,
    done,
    addedDate:    li.querySelector('.task-byline')?.dataset.addedDate ?? null,
    repeat:       li.querySelector('.task-byline')?.dataset.repeat    ?? null,
    weekday:      li.querySelector('.task-byline')?.dataset.weekday   ?? null,
    seriesId:     li.dataset.seriesId     ?? null,
    category:     li.dataset.category     ?? null,
    subtasksDone: li.dataset.subtasksDone ? JSON.parse(li.dataset.subtasksDone) : [],
    owner:        li.dataset.owner        ?? 'cristina',
  });
  const active = Array.from(taskList.querySelectorAll('.task-item')).map(li => toObj(li, false));
  const done   = Array.from(completedList.querySelectorAll('.task-item')).map(li => toObj(li, true));
  db.ref('tasks').set([...active, ...done]);
}

function saveDetailTasks() {
  const tasks = Array.from(detailTaskList.querySelectorAll('.detail-task-item')).map(tr => ({
    id: tr.dataset.id,
    title: tr.querySelector('.detail-task-title').textContent,
    date: tr.dataset.date ?? '',
    repeat: tr.querySelector('.detail-task-repeat')?.dataset.value ?? 'daily',
    weekday: tr.querySelector('.detail-task-repeat')?.dataset.weekday ?? '',
    category: tr.dataset.category ?? '',
    description: tr.dataset.description ?? '',
    subtasks: tr.dataset.subtasks ? JSON.parse(tr.dataset.subtasks) : [],
    owner: tr.dataset.owner ?? 'cristina',
    link:  tr.dataset.link  ?? '',
    checklistState: tr.dataset.checklistState ? JSON.parse(tr.dataset.checklistState) : [],
  }));
  db.ref('detail-tasks').set(tasks.length ? tasks : null);
}

// --- Main task list ---

function updateEmptyState() {
  emptyState.hidden = visibleCount(taskList) > 0 || visibleCount(completedList) > 0;
}

function sortTaskList() {
  const items = Array.from(taskList.querySelectorAll('.task-item'));
  const dated   = items.filter(li =>  li.querySelector('.task-byline'));
  const undated = items.filter(li => !li.querySelector('.task-byline'));
  dated.sort((a, b) => {
    const da = a.querySelector('.task-byline').dataset.addedDate;
    const db = b.querySelector('.task-byline').dataset.addedDate;
    return da < db ? -1 : da > db ? 1 : 0;
  });
  [...dated, ...undated].forEach(li => taskList.appendChild(li));
}

function addTask(text, done = false, meta = null, save = true) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const li = document.createElement('li');
  li.className = 'task-item' + (done ? ' done' : '');
  if (meta?.seriesId)             li.dataset.seriesId     = meta.seriesId;
  if (meta?.category)             li.dataset.category     = meta.category;
  if (meta?.subtasksDone?.length) li.dataset.subtasksDone = JSON.stringify(meta.subtasksDone);
  li.dataset.owner = meta?.owner ?? activeHoyOwner;

  const checkbox = document.createElement('button');
  checkbox.className = 'checkbox';
  checkbox.setAttribute('aria-label', 'Marcar como completada');

  const checkmark = document.createElement('span');
  checkmark.className = 'checkmark';
  checkmark.innerHTML = `<svg viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  checkbox.appendChild(checkmark);

  const textWrapper = document.createElement('div');
  textWrapper.className = 'task-text-wrapper';

  const span = document.createElement('span');
  span.className = 'task-text';
  span.textContent = trimmed;
  textWrapper.appendChild(span);

  if (meta?.addedDate) {
    const byline = document.createElement('span');
    byline.className = 'task-byline';
    byline.dataset.addedDate = meta.addedDate;
    if (meta.repeat) byline.dataset.repeat = meta.repeat;

    let weekday = meta.weekday || '';
    if (meta.repeat === 'weekly' && !weekday && meta.seriesId) {
      const detailEl = document.getElementById('detail-task-list')
        ?.querySelector(`[data-id="${meta.seriesId}"]`);
      weekday = detailEl?.querySelector('.detail-task-repeat')?.dataset.weekday ?? '';
    }
    if (weekday) byline.dataset.weekday = weekday;

    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDate(meta.addedDate);
    if (meta.addedDate < todayStr()) dateSpan.classList.add('task-byline--past');
    byline.appendChild(dateSpan);
    if (meta.repeat) byline.appendChild(document.createTextNode(` · ${repeatDisplay(meta.repeat, weekday)}`));
    textWrapper.appendChild(byline);
  }

  li.addEventListener('click', (e) => {
    if (e.target.closest('.checkbox')) return;
    openHoyPanel(li);
  });

  checkbox.addEventListener('click', () => {
    const isDone = !li.classList.contains('done');
    li.classList.toggle('done', isDone);
    if (isDone) {
      completedList.appendChild(li);
    } else {
      taskList.appendChild(li);
      sortTaskList();
    }
    updateEmptyState();
    updateCompletedSection();
    saveTasks();
  });

  li.appendChild(checkbox);
  li.appendChild(textWrapper);

  if (done) {
    completedList.appendChild(li);
  } else {
    taskList.appendChild(li);
    sortTaskList();
  }

  updateEmptyState();
  updateCompletedSection();
  if (save) saveTasks();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTask(input.value, false, { addedDate: todayStr() });
  input.value = '';
  input.focus();
});

// --- Planificadas ---

const detailForm      = document.getElementById('detail-task-form');
const detailTitle     = document.getElementById('detail-title');
const detailDate      = document.getElementById('detail-date');
const detailRepeat    = document.getElementById('detail-repeat');
const detailWeekday   = document.getElementById('detail-weekday');
const weekdayGroup    = document.getElementById('weekday-group');
const detailTaskList  = document.getElementById('detail-task-list');
const detailEmptyState = document.getElementById('detail-empty-state');

function updateDetailEmptyState() {
  detailEmptyState.hidden = detailTaskList.children.length > 0;
}

function addSubtaskRow(text = '') {
  const li = document.createElement('li');
  li.className = 'subtask-item';
  li.dataset.id = Date.now().toString() + Math.random().toString(36).slice(2);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'subtask-input';
  input.placeholder = 'Nombre de la subtarea';
  input.value = text;
  input.maxLength = 200;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'subtask-remove';
  removeBtn.setAttribute('aria-label', 'Eliminar subtarea');
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => li.remove());

  li.append(input, removeBtn);
  editSubtasksList.appendChild(li);
  if (!text) input.focus();
}

function renderSubtasks(subtasks) {
  editSubtasksList.innerHTML = '';
  subtasks.forEach(s => addSubtaskRow(s.text));
}

function getSubtasks() {
  return Array.from(editSubtasksList.querySelectorAll('.subtask-item')).map(li => ({
    id: li.dataset.id,
    text: li.querySelector('.subtask-input').value.trim(),
  })).filter(s => s.text);
}

const ownerMeta = {
  cristina: { label: 'Cristina', initial: 'C', color: '#7c3aed' },
  fernando: { label: 'Fernando', initial: 'F', color: '#2563eb' },
};

function buildOwnerAvatar(owner) {
  const meta = ownerMeta[owner] ?? ownerMeta.cristina;
  const wrap = document.createElement('span');
  wrap.className = 'owner-cell';

  const avatar = document.createElement('span');
  avatar.className = 'owner-avatar';
  avatar.textContent = meta.initial;
  avatar.style.background = meta.color;

  const name = document.createElement('span');
  name.textContent = meta.label;

  wrap.append(avatar, name);
  return wrap;
}

function addDetailTask(title, date, repeat = 'daily', weekday = '', id = null, category = '', description = '', subtasks = [], owner = 'cristina', link = '', checklistState = [], save = true) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const tr = document.createElement('tr');
  tr.className = 'detail-task-item';
  tr.dataset.id = id ?? Date.now().toString();
  if (date) tr.dataset.date = date;
  if (description) tr.dataset.description = description;
  if (category) tr.dataset.category = category;
  if (subtasks?.length) tr.dataset.subtasks = JSON.stringify(subtasks);
  if (owner) tr.dataset.owner = owner;
  if (link)  tr.dataset.link  = link;
  if (checklistState?.length) tr.dataset.checklistState = JSON.stringify(checklistState);

  const nameCell = document.createElement('td');
  nameCell.className = 'detail-task-name-cell';
  const titleEl = document.createElement('span');
  titleEl.className = 'detail-task-title';
  titleEl.textContent = trimmed;
  nameCell.appendChild(titleEl);

  const repeatCell = document.createElement('td');
  repeatCell.className = 'detail-task-repeat-cell';
  const repeatEl = document.createElement('span');
  repeatEl.className = 'detail-task-repeat';
  repeatEl.dataset.value = repeat;
  repeatEl.dataset.weekday = weekday;
  repeatEl.textContent = repeat === 'weekly' && weekday
    ? `Todos los ${weekdayPlurals[weekday]}`
    : repeatLabels[repeat] ?? repeat;
  repeatCell.appendChild(repeatEl);

  const dateCell = document.createElement('td');
  dateCell.className = 'detail-task-date-cell';
  dateCell.textContent = formatDate(date);

  const catCell = document.createElement('td');
  catCell.className = 'detail-task-cat-cell';
  const chipEl = document.createElement('span');
  chipEl.className = 'category-chip';
  chipEl.textContent = categoryNames[category] ?? category;
  chipEl.style.background = categoryPastels[category] ?? '#f0f0f0';
  chipEl.style.color = categoryColors[category] ?? '#666';
  catCell.appendChild(chipEl);

  tr.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) return;
    editingId = tr.dataset.id;
    const rEl = tr.querySelector('.detail-task-repeat');
    editTitle.value    = tr.querySelector('.detail-task-title').textContent;
    editDate.value     = tr.dataset.date ?? '';
    editCategory.value = tr.dataset.category ?? 'hogar';
    editRepeat.value   = rEl?.dataset.value ?? 'daily';
    editWeekday.value  = rEl?.dataset.weekday || '1';
    editWeekdayGroup.hidden = editRepeat.value !== 'weekly';
    updateEditCategoryDot();
    openEditPanel();
  });

  const ownerCell = document.createElement('td');
  ownerCell.className = 'detail-task-owner-cell';
  ownerCell.appendChild(buildOwnerAvatar(owner));

  tr.appendChild(nameCell);
  tr.appendChild(ownerCell);
  tr.appendChild(repeatCell);
  tr.appendChild(dateCell);
  tr.appendChild(catCell);
  detailTaskList.appendChild(tr);
  if (save) sortDetailTaskList();

  updateDetailEmptyState();
  if (save) saveDetailTasks();
}

const repeatOrder  = { daily: 0, weekly: 1, monthly: 2, quarterly: 3, yearly: 4, biannually: 5 };
const weekdayOrder = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '0': 6 };
const categoryOrder = { hogar: 0, personal: 1, salud: 2 };

let sortState = { col: 'repeat', dir: 'asc' };

function sortDetailTaskList() {
  const { col, dir } = sortState;
  const sign = dir === 'asc' ? 1 : -1;

  Array.from(detailTaskList.querySelectorAll('.detail-task-item'))
    .sort((a, b) => {
      if (col === 'category') {
        const cA = categoryOrder[a.dataset.category ?? ''] ?? 99;
        const cB = categoryOrder[b.dataset.category ?? ''] ?? 99;
        return (cA - cB) * sign;
      }
      const rA = a.querySelector('.detail-task-repeat')?.dataset.value ?? 'daily';
      const rB = b.querySelector('.detail-task-repeat')?.dataset.value ?? 'daily';
      const ro = ((repeatOrder[rA] ?? 99) - (repeatOrder[rB] ?? 99)) * sign;
      if (ro !== 0) return ro;
      if (rA === 'weekly') {
        const wA = weekdayOrder[a.querySelector('.detail-task-repeat')?.dataset.weekday ?? '0'] ?? 6;
        const wB = weekdayOrder[b.querySelector('.detail-task-repeat')?.dataset.weekday ?? '0'] ?? 6;
        return (wA - wB) * sign;
      }
      return 0;
    })
    .forEach(tr => detailTaskList.appendChild(tr));

  updateSortIndicators();
}

function updateSortIndicators() {
  const thRepeat   = document.getElementById('th-repeat');
  const thCategory = document.getElementById('th-category');
  if (!thRepeat || !thCategory) return;

  thRepeat.querySelector('.sort-indicator').textContent   = sortState.col === 'repeat'   ? (sortState.dir === 'asc' ? '↑' : '↓') : '↕';
  thCategory.querySelector('.sort-indicator').textContent = sortState.col === 'category' ? (sortState.dir === 'asc' ? '↑' : '↓') : '↕';

  thRepeat.classList.toggle('th-active',   sortState.col === 'repeat');
  thCategory.classList.toggle('th-active', sortState.col === 'category');
}

document.getElementById('th-repeat').addEventListener('click', () => {
  sortState = sortState.col === 'repeat'
    ? { col: 'repeat', dir: sortState.dir === 'asc' ? 'desc' : 'asc' }
    : { col: 'repeat', dir: 'asc' };
  sortDetailTaskList();
});

document.getElementById('th-category').addEventListener('click', () => {
  sortState = sortState.col === 'category'
    ? { col: 'category', dir: sortState.dir === 'asc' ? 'desc' : 'asc' }
    : { col: 'category', dir: 'asc' };
  sortDetailTaskList();
});

function syncRecurringTasks() {
  const today = todayStr();
  const todayWeekday = new Date().getDay().toString();
  const log = JSON.parse(localStorage.getItem('daily-log') ?? '{}');
  let logUpdated = false;

  detailTaskList.querySelectorAll('.detail-task-item').forEach(li => {
    const id = li.dataset.id;
    const repeatEl = li.querySelector('.detail-task-repeat');
    const repeat   = repeatEl?.dataset.value;
    const weekday  = repeatEl?.dataset.weekday ?? '';
    const startDate = li.dataset.date ?? '';

    if (!['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'biannually'].includes(repeat)) return;
    if (startDate && startDate > today) return;
    if (log[id] === today) return;
    if (repeat === 'weekly' && weekday !== todayWeekday) return;
    if (repeat === 'monthly' && startDate.slice(8) !== today.slice(8)) return;
    if (repeat === 'quarterly') {
      if (startDate.slice(8) !== today.slice(8)) return;
      const start = new Date(startDate), now = new Date(today);
      const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      if (months % 3 !== 0) return;
    }
    if (repeat === 'yearly') {
      if (startDate.slice(5) !== today.slice(5)) return;
    }
    if (repeat === 'biannually') {
      if (startDate.slice(5) !== today.slice(5)) return;
      const years = new Date(today).getFullYear() - new Date(startDate).getFullYear();
      if (years % 2 !== 0) return;
    }

    const pendingExists = Array.from(taskList.querySelectorAll('.task-item:not(.done)')).some(
      task => task.dataset.seriesId === id
    );
    if (pendingExists) return;

    addTask(li.querySelector('.detail-task-title').textContent, false, { addedDate: today, repeat, weekday, seriesId: id, category: li.dataset.category ?? null, owner: li.dataset.owner ?? 'cristina' });
    log[id] = today;
    logUpdated = true;
  });

  if (logUpdated) localStorage.setItem('daily-log', JSON.stringify(log));
}

const categoryColors   = { hogar: '#f5c518', personal: '#9b5de5', salud: '#22c55e' };
const categoryPastels  = { hogar: '#fef9c3', personal: '#ede9fe', salud: '#dcfce7' };
const categoryNames    = { hogar: 'Hogar', personal: 'Personal', salud: 'Salud' };

const detailCategory  = document.getElementById('detail-category');
const categoryDot     = document.getElementById('category-dot');
const detailOwner     = document.getElementById('detail-owner');
const detailLink      = document.getElementById('detail-link');
const editOwner       = document.getElementById('edit-owner');
const editLink        = document.getElementById('edit-link');

function updateCategoryDot() {
  categoryDot.style.background = categoryColors[detailCategory.value] ?? 'transparent';
}

detailCategory.addEventListener('change', updateCategoryDot);
updateCategoryDot();

// --- Modal (crear tarea) ---
const planModalOverlay = document.getElementById('plan-modal-overlay');
const planModalClose   = document.getElementById('plan-modal-close');
const newPlanBtn       = document.getElementById('new-plan-btn');

function openPlanModal() {
  planModalOverlay.hidden = false;
  detailTitle.focus();
}

function closePlanModal() {
  planModalOverlay.hidden = true;
  detailTitle.value    = '';
  detailDate.value     = '';
  detailRepeat.value   = 'daily';
  detailCategory.value = 'hogar';
  detailOwner.value    = 'cristina';
  detailLink.value     = '';
  weekdayGroup.hidden  = true;
  updateCategoryDot();
}

newPlanBtn.addEventListener('click', openPlanModal);
planModalClose.addEventListener('click', closePlanModal);
planModalOverlay.addEventListener('click', (e) => {
  if (e.target === planModalOverlay) closePlanModal();
});

detailRepeat.addEventListener('change', () => {
  weekdayGroup.hidden = detailRepeat.value !== 'weekly';
});

detailForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addDetailTask(
    detailTitle.value,
    detailDate.value,
    detailRepeat.value,
    detailRepeat.value === 'weekly' ? detailWeekday.value : '',
    null,
    detailCategory.value,
    '',
    [],
    detailOwner.value,
    detailLink.value.trim()
  );
  closePlanModal();
});

// --- Panel lateral Hoy (detalle de tarea) ---

function applyChecklistState(html, checklistState) {
  if (!checklistState.length || !html) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let idx = 0;
  for (const ul of Array.from(doc.querySelectorAll('ul[data-checked]'))) {
    const lis = Array.from(ul.querySelectorAll(':scope > li'));
    if (lis.length === 1) {
      if (idx < checklistState.length) ul.dataset.checked = checklistState[idx++] ? 'true' : 'false';
    } else {
      for (const li of lis) {
        const newUl = doc.createElement('ul');
        newUl.dataset.checked = (idx < checklistState.length && checklistState[idx]) ? 'true' : 'false';
        idx++;
        newUl.appendChild(li.cloneNode(true));
        ul.parentNode.insertBefore(newUl, ul);
      }
      ul.parentNode.removeChild(ul);
    }
  }
  return doc.body.innerHTML;
}

function openHoyPanel(li) {
  hoyActiveLi = li;

  const text    = li.querySelector('.task-text').textContent;
  const byline  = li.querySelector('.task-byline');
  const date    = byline?.dataset.addedDate ?? null;
  const repeat  = byline?.dataset.repeat    ?? null;
  const weekday = byline?.dataset.weekday   ?? null;

  hoyPanelTitle.textContent = text;

  const dateWrap   = document.getElementById('hoy-meta-date-wrap');
  const repeatWrap = document.getElementById('hoy-meta-repeat-wrap');
  const metaSep    = document.getElementById('hoy-meta-sep');

  if (date) {
    hoyPanelDate.textContent = formatDate(date);
    dateWrap.hidden = false;
  } else {
    dateWrap.hidden = true;
  }

  if (repeat) {
    hoyPanelRepeat.textContent = repeatDisplay(repeat, weekday);
    repeatWrap.hidden = false;
  } else {
    repeatWrap.hidden = true;
  }

  metaSep.hidden = !date || !repeat;

  const seriesId = li.dataset.seriesId ?? null;
  const planLi   = seriesId ? detailTaskList.querySelector(`[data-id="${seriesId}"]`) : null;
  hoyActivePlanLi = planLi ?? null;
  const desc = planLi?.dataset.description ?? '';
  const checklistState = planLi?.dataset.checklistState ? JSON.parse(planLi.dataset.checklistState) : [];
  const hasDesc = desc && desc !== '<p><br></p>';
  hoyQuill.clipboard.dangerouslyPasteHTML(hasDesc ? applyChecklistState(desc, checklistState) : '');
  hoyPanelDescField.hidden = false;
  hoyPanelDescPlaceholder.hidden = hasDesc;
  document.getElementById('hoy-panel-desc-editor').hidden = !hasDesc;

  const subtasks     = planLi?.dataset.subtasks ? JSON.parse(planLi.dataset.subtasks) : [];
  const subtasksDone = li.dataset.subtasksDone  ? JSON.parse(li.dataset.subtasksDone)  : [];
  renderHoySubtasks(subtasks, subtasksDone);

  hoyDetailPanel.classList.add('open');
  if (window.innerWidth > 600) {
    document.getElementById('task-form').style.right = '360px';
  }
}

function renderHoySubtasks(subtasks, doneIds) {
  const field = document.getElementById('hoy-panel-subtasks-field');
  const list  = document.getElementById('hoy-panel-subtasks-list');
  list.innerHTML = '';

  if (!subtasks.length) { field.hidden = true; return; }
  field.hidden = false;

  subtasks.forEach(s => {
    const li = document.createElement('li');
    li.className = 'hoy-subtask-item';
    if (doneIds.includes(s.id)) li.classList.add('done');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hoy-subtask-checkbox';

    btn.addEventListener('click', () => {
      li.classList.toggle('done');
      const isDone = li.classList.contains('done');
      const current = hoyActiveLi?.dataset.subtasksDone ? JSON.parse(hoyActiveLi.dataset.subtasksDone) : [];
      const updated = isDone ? [...current, s.id] : current.filter(id => id !== s.id);
      if (hoyActiveLi) {
        if (updated.length) hoyActiveLi.dataset.subtasksDone = JSON.stringify(updated);
        else delete hoyActiveLi.dataset.subtasksDone;
        saveTasks();
      }
    });

    const label = document.createElement('span');
    label.className = 'hoy-subtask-text';
    label.textContent = s.text;

    li.append(btn, label);
    list.appendChild(li);
  });
}

function closeHoyPanel() {
  hoyDetailPanel.classList.remove('open');
  hoyActiveLi    = null;
  hoyActivePlanLi = null;
  hoyPanelDescField.hidden = true;
  hoyMenuDropdown.hidden = true;
  document.getElementById('task-form').style.right = '';
}

hoyPanelClose.addEventListener('click', closeHoyPanel);

hoyMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  hoyMenuDropdown.hidden = !hoyMenuDropdown.hidden;
});

document.addEventListener('click', () => {
  if (!hoyMenuDropdown.hidden) hoyMenuDropdown.hidden = true;
});

hoyPanelDeleteBtn.addEventListener('click', () => {
  if (!hoyActiveLi) return;
  hoyActiveLi.remove();
  closeHoyPanel();
  updateEmptyState();
  updateCompletedSection();
  saveTasks();
});

// --- Panel lateral (editar tarea) ---
const editPanel        = document.getElementById('edit-panel');
const editPanelClose   = document.getElementById('edit-panel-close');
const editForm         = document.getElementById('edit-task-form');
const editTitle        = document.getElementById('edit-title');
const editDate         = document.getElementById('edit-date');
const editRepeat       = document.getElementById('edit-repeat');
const editWeekday      = document.getElementById('edit-weekday');
const editWeekdayGroup = document.getElementById('edit-weekday-group');
const editCategory     = document.getElementById('edit-category');
const editCategoryDot  = document.getElementById('edit-category-dot');

const quillOptions = {
  theme: 'bubble',
  placeholder: 'Añade una descripción...',
  modules: {
    toolbar: [
      ['bold', 'italic'],
      [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
    ],
  },
};

const quill    = new Quill('#description-editor',  quillOptions);
const hoyQuill = new Quill('#hoy-panel-desc-editor', {
  theme: 'bubble',
  readOnly: true,
  modules: { toolbar: false },
});

hoyQuill.container.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const ul = li.closest('ul[data-checked]');
  if (!ul) return;

  e.preventDefault();
  if (!hoyActivePlanLi) return;

  const allLis = Array.from(hoyQuill.root.querySelectorAll('ul[data-checked] > li'));
  const clickedIndex = allLis.indexOf(li);
  if (clickedIndex === -1) return;

  const stored = hoyActivePlanLi.dataset.checklistState;
  const checklistState = stored
    ? JSON.parse(stored)
    : allLis.map(item => item.closest('ul[data-checked]').dataset.checked === 'true');

  while (checklistState.length < allLis.length) checklistState.push(false);
  checklistState[clickedIndex] = !checklistState[clickedIndex];

  hoyActivePlanLi.dataset.checklistState = JSON.stringify(checklistState);
  saveDetailTasks();

  const desc = hoyActivePlanLi.dataset.description ?? '';
  hoyQuill.clipboard.dangerouslyPasteHTML(applyChecklistState(desc, checklistState));
});

let editingId = null;

function updateEditCategoryDot() {
  editCategoryDot.style.background = categoryColors[editCategory.value] ?? 'transparent';
}

function openEditPanel() {
  const li = detailTaskList.querySelector(`[data-id="${editingId}"]`);
  const desc = li?.dataset.description ?? '';
  quill.clipboard.dangerouslyPasteHTML(desc);
  const subtasks = li?.dataset.subtasks ? JSON.parse(li.dataset.subtasks) : [];
  renderSubtasks(subtasks);
  editOwner.value = li?.dataset.owner ?? 'cristina';
  editLink.value  = li?.dataset.link  ?? '';
  editPanel.classList.add('open');
  editTitle.focus();
}

function closeEditPanel() {
  editPanel.classList.remove('open');
  editingId = null;
}

editPanelClose.addEventListener('click', closeEditPanel);
editAddSubtask.addEventListener('click', () => addSubtaskRow());

document.getElementById('edit-delete-btn').addEventListener('click', () => {
  const li = detailTaskList.querySelector(`[data-id="${editingId}"]`);
  if (!li) return;
  li.remove();
  closeEditPanel();
  updateDetailEmptyState();
  saveDetailTasks();
});
editRepeat.addEventListener('change', () => {
  editWeekdayGroup.hidden = editRepeat.value !== 'weekly';
});
editCategory.addEventListener('change', updateEditCategoryDot);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!planModalOverlay.hidden) closePlanModal();
    else if (hoyDetailPanel.classList.contains('open')) closeHoyPanel();
    else closeEditPanel();
  }
});

function applyDetailTaskEdit(id) {
  const tr = detailTaskList.querySelector(`[data-id="${id}"]`);
  if (!tr) return;

  const category = editCategory.value;
  const repeat   = editRepeat.value;
  const weekday  = repeat === 'weekly' ? editWeekday.value : '';
  const date     = editDate.value;

  tr.dataset.category = category;
  if (date) tr.dataset.date = date; else delete tr.dataset.date;
  const descHtml = quill.root.innerHTML;
  if (descHtml && descHtml !== '<p><br></p>') tr.dataset.description = descHtml;
  else delete tr.dataset.description;

  const subtasks = getSubtasks();
  if (subtasks.length) tr.dataset.subtasks = JSON.stringify(subtasks);
  else delete tr.dataset.subtasks;

  tr.dataset.owner = editOwner.value;
  const linkVal = editLink.value.trim();
  if (linkVal) tr.dataset.link = linkVal; else delete tr.dataset.link;
  const ownerCellEl = tr.querySelector('.detail-task-owner-cell');
  ownerCellEl.innerHTML = '';
  ownerCellEl.appendChild(buildOwnerAvatar(editOwner.value));

  tr.querySelector('.detail-task-title').textContent = editTitle.value.trim();

  const repeatEl = tr.querySelector('.detail-task-repeat');
  repeatEl.dataset.value = repeat;
  repeatEl.dataset.weekday = weekday;
  repeatEl.textContent = repeat === 'weekly' && weekday
    ? `Todos los ${weekdayPlurals[weekday]}`
    : repeatLabels[repeat] ?? repeat;

  tr.querySelector('.detail-task-date-cell').textContent = formatDate(date);

  const chipEl = tr.querySelector('.category-chip');
  chipEl.textContent = categoryNames[category] ?? category;
  chipEl.style.background = categoryPastels[category] ?? '#f0f0f0';
  chipEl.style.color = categoryColors[category] ?? '#666';

  sortDetailTaskList();
  saveDetailTasks();
}

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  applyDetailTaskEdit(editingId);
  closeEditPanel();
});

// --- Auth + Firebase real-time listeners ---

let detailReady      = false;
let tasksReady       = false;
let recurringDone    = false;
let listenersStarted = false;

function maybeSyncRecurring() {
  if (detailReady && tasksReady && !recurringDone) {
    recurringDone = true;
    syncRecurringTasks();
  }
}

function startFirebaseListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  db.ref('detail-tasks').on('value', (snapshot) => {
  const data = snapshot.val();

  // Migrate from localStorage if Firebase is empty on first load
  if (!detailReady && !data) {
    const local = localStorage.getItem('detail-tasks');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.length) {
        db.ref('detail-tasks').set(parsed);
        localStorage.removeItem('detail-tasks');
        return;
      }
    }
  }

  detailTaskList.innerHTML = '';
  if (data) {
    data.forEach(t => {
      const repeat = (t.repeat === 'never' || !t.repeat) ? 'daily' : t.repeat;
      addDetailTask(t.title, t.date, repeat, t.weekday ?? '', t.id ?? null, t.category ?? '', t.description ?? '', t.subtasks ?? [], t.owner ?? 'cristina', t.link ?? '', t.checklistState ?? [], false);
    });
    sortDetailTaskList();
  }
  updateDetailEmptyState();
  updateNavCounts();

  if (!detailReady) {
    detailReady = true;
    maybeSyncRecurring();
  }
});

db.ref('tasks').on('value', (snapshot) => {
  const data = snapshot.val();

  // Migrate from localStorage if Firebase is empty on first load
  if (!tasksReady && !data) {
    const local = localStorage.getItem('tasks');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.length) {
        db.ref('tasks').set(parsed);
        localStorage.removeItem('tasks');
        return;
      }
    }
  }

  // Save panel state to restore after re-render
  const panelOpen  = hoyDetailPanel.classList.contains('open');
  const savedText  = hoyActiveLi?.querySelector('.task-text')?.textContent;
  const savedOwner = hoyActiveLi?.dataset.owner;

  taskList.innerHTML = '';
  completedList.innerHTML = '';

  if (data) {
    data.forEach(t => {
      if (typeof t === 'string') {
        addTask(t, false, null, false);
      } else {
        const meta = t.addedDate ? {
          addedDate: t.addedDate, repeat: t.repeat, weekday: t.weekday,
          seriesId: t.seriesId, category: t.category, subtasksDone: t.subtasksDone ?? [],
          owner: t.owner ?? 'cristina'
        } : null;
        addTask(t.text, t.done, meta, false);
      }
    });
  }

  // Reopen panel if task still exists after re-render
  if (panelOpen && savedText) {
    const allItems = [
      ...taskList.querySelectorAll('.task-item'),
      ...completedList.querySelectorAll('.task-item'),
    ];
    const match = allItems.find(li =>
      li.querySelector('.task-text')?.textContent === savedText &&
      li.dataset.owner === savedOwner
    );
    if (match) openHoyPanel(match);
    else closeHoyPanel();
  }

  filterHoyTasks();
  updateEmptyState();
  updateCompletedSection();
  updateNavCounts();

  if (!tasksReady) {
    tasksReady = true;
    maybeSyncRecurring();
  }
  });
}

auth.onAuthStateChanged((user) => {
  const overlay  = document.getElementById('login-overlay');
  const layout   = document.getElementById('app-layout');
  const loading  = document.getElementById('auth-loading');
  loading.hidden = true;
  if (user) {
    overlay.hidden = true;
    layout.removeAttribute('hidden');
    restoreNavState();
    startFirebaseListeners();
  } else {
    overlay.hidden = false;
    layout.setAttribute('hidden', '');
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  errorEl.textContent = '';
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch {
    errorEl.textContent = 'Email o contraseña incorrectos';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut().then(() => location.reload());
});
