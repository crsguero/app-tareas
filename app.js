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
    closeEditPanel();
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
  const allHoyTasks = [...taskList.querySelectorAll('.task-item')];
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
  const ownerLabel = ownerMeta[activeHoyOwner]?.label ?? activeHoyOwner;
  document.getElementById('view-hoy-title').textContent = ownerLabel;
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
    subtasksDone: li.dataset.subtasksDone ? JSON.parse(li.dataset.subtasksDone) : [],
    owner:        li.dataset.owner        ?? 'cristina',
  });
  const active = Array.from(taskList.querySelectorAll('.task-item')).map(li => toObj(li, false));
  const done   = Array.from(completedList.querySelectorAll('.task-item')).map(li => toObj(li, true));
  db.ref('tasks').set([...active, ...done]);
}

function saveDetailTasks() {
  const tasks = Array.from(detailTaskList.querySelectorAll('.detail-task-item')).map((tr, i) => {
    tr.dataset.order = i; // el orden persistido refleja la posición actual (incluye drag & drop)
    return {
      id: tr.dataset.id,
      title: tr.querySelector('.detail-task-title').textContent,
      date: tr.dataset.date ?? '',
      repeat: tr.querySelector('.detail-task-repeat')?.dataset.value ?? 'daily',
      weekday: tr.querySelector('.detail-task-repeat')?.dataset.weekday ?? '',
      description: tr.dataset.description ?? '',
      subtasks: tr.dataset.subtasks ? JSON.parse(tr.dataset.subtasks) : [],
      owner: tr.dataset.owner ?? 'cristina',
      link:  tr.dataset.link  ?? '',
      checklistState: tr.dataset.checklistState ? JSON.parse(tr.dataset.checklistState) : [],
      alternaTareas: tr.dataset.alternaTareas === 'true',
      linkedTasks: tr.dataset.linkedTasks ? JSON.parse(tr.dataset.linkedTasks) : [],
      category: tr.dataset.category ?? '',
      enabled: tr.dataset.enabled !== 'false',
      order: i,
    };
  });
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

    const dateWrap = document.createElement('span');
    dateWrap.className = 'task-byline-item';
    if (meta.addedDate < todayStr()) dateWrap.classList.add('task-byline--past');
    dateWrap.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.6667 2.66663H3.33333C2.59695 2.66663 2 3.26358 2 3.99996V13.3333C2 14.0697 2.59695 14.6666 3.33333 14.6666H12.6667C13.403 14.6666 14 14.0697 14 13.3333V3.99996C14 3.26358 13.403 2.66663 12.6667 2.66663Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.6665 1.33337V4.00004" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.3335 1.33337V4.00004" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 6.66663H14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const dateText = document.createElement('span');
    dateText.textContent = formatDate(meta.addedDate);
    dateWrap.appendChild(dateText);
    byline.appendChild(dateWrap);

    if (meta.repeat) {
      const sep = document.createElement('span');
      sep.textContent = ' · ';
      byline.appendChild(sep);
      const repeatWrap = document.createElement('span');
      repeatWrap.className = 'task-byline-item';
      repeatWrap.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.3335 0.666626L14.0002 3.33329L11.3335 5.99996" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 7.33337V6.00004C2 5.2928 2.28095 4.61452 2.78105 4.11442C3.28115 3.61433 3.95942 3.33337 4.66667 3.33337H14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.66667 15.3333L2 12.6667L4.66667 10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8.66663V9.99996C14 10.7072 13.719 11.3855 13.219 11.8856C12.7189 12.3857 12.0406 12.6666 11.3333 12.6666H2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const repeatText = document.createElement('span');
      repeatText.textContent = repeatDisplay(meta.repeat, weekday);
      repeatWrap.appendChild(repeatText);
      byline.appendChild(repeatWrap);
    }
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
const detailEmptyStateText = detailEmptyState.querySelector('p');

// Pestañas de Planificadas (clave = data-filter del botón).
// 'all' muestra la tabla; 'weekly' muestra el tablero semanal.
const detailFilters = {
  all: () => true,
};

const detailTaskListWrapper = document.getElementById('detail-task-list-wrapper');
const planWeekBoard         = document.getElementById('plan-week-board');

let detailFilter = 'all';
try {
  const savedTab = localStorage.getItem('plan-tab');
  if (savedTab && document.querySelector(`.plan-tab[data-filter="${savedTab}"]`)) detailFilter = savedTab;
} catch {}
document.querySelectorAll('.plan-tab').forEach(b => b.classList.toggle('plan-tab--active', b.dataset.filter === detailFilter));

// Filtros por responsable y categoría; persisten en localStorage hasta que se limpian
const planFilterOwner    = document.getElementById('plan-filter-owner');
const planFilterCategory = document.getElementById('plan-filter-category');
const planFilterClear    = document.getElementById('plan-filter-clear');
const NO_CATEGORY = '__none';

let planFilters = { owner: '', category: '' };
try {
  const saved = JSON.parse(localStorage.getItem('plan-filters') ?? 'null');
  if (saved) planFilters = { owner: saved.owner ?? '', category: saved.category ?? '' };
} catch {}

function savePlanFilters() {
  try { localStorage.setItem('plan-filters', JSON.stringify(planFilters)); } catch {}
}

function matchesPlanFilters(tr) {
  if (planFilters.owner && (tr.dataset.owner ?? 'cristina') !== planFilters.owner) return false;
  if (planFilters.category) {
    const cat = tr.dataset.category ?? '';
    if (planFilters.category === NO_CATEGORY ? cat !== '' : cat !== planFilters.category) return false;
  }
  return true;
}

function syncPlanFilterControls() {
  planFilterOwner.value    = planFilters.owner;
  planFilterCategory.value = planFilters.category;
  planFilterOwner.classList.toggle('plan-filter--active', !!planFilters.owner);
  planFilterCategory.classList.toggle('plan-filter--active', !!planFilters.category);
  planFilterClear.hidden = !planFilters.owner && !planFilters.category;
}

function applyDetailFilter() {
  const isWeekly = detailFilter === 'weekly';
  detailTaskListWrapper.hidden = isWeekly;
  planWeekBoard.hidden = !isWeekly;
  if (isWeekly) {
    renderWeekBoard();
    return;
  }
  const matches = detailFilters[detailFilter] ?? detailFilters.all;
  document.querySelectorAll('.detail-task-item').forEach(tr => {
    tr.hidden = !matches(tr) || !matchesPlanFilters(tr);
  });
  updateDetailEmptyState();
}

// --- Tablero semanal: una columna por día con las tareas semanales de ese día ---
const weekBoardDays = [
  ['1', 'Lunes'], ['2', 'Martes'], ['3', 'Miércoles'], ['4', 'Jueves'],
  ['5', 'Viernes'], ['6', 'Sábado'], ['0', 'Domingo'],
];

function buildWeekCard(tr) {
  const card = document.createElement('div');
  card.className = 'plan-week-card';
  card.dataset.id = tr.dataset.id;
  card.tabIndex = 0;
  card.draggable = true;
  if (tr.classList.contains('detail-task-item--selected')) card.classList.add('plan-week-card--selected');

  const title = document.createElement('span');
  title.className = 'plan-week-card-title';
  title.textContent = tr.querySelector('.detail-task-title').textContent;

  const meta = document.createElement('div');
  meta.className = 'plan-week-card-meta';
  const owner = document.createElement('span');
  renderOwnerCell(owner, tr.dataset.owner ?? 'cristina');
  meta.appendChild(owner);
  if (categoryNames[tr.dataset.category]) {
    const cat = document.createElement('span');
    renderCategoryCell(cat, tr.dataset.category);
    meta.appendChild(cat);
  }

  card.append(title, meta);
  // Abre el mismo panel de edición que la fila de la tabla
  card.addEventListener('click', () => tr.click());
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tr.click(); }
  });
  return card;
}

function renderWeekBoard() {
  const rows = Array.from(detailTaskList.querySelectorAll('.detail-task-item')).filter(tr =>
    tr.querySelector('.detail-task-repeat')?.dataset.value === 'weekly'
    && tr.dataset.enabled !== 'false' // las desactivadas no se muestran en el tablero
    && matchesPlanFilters(tr)
  );
  planWeekBoard.innerHTML = '';
  weekBoardDays.forEach(([day, label]) => {
    const dayRows = rows.filter(tr => tr.querySelector('.detail-task-repeat').dataset.weekday === day);

    const col = document.createElement('section');
    col.className = 'plan-week-col';
    col.dataset.day = day;

    const header = document.createElement('header');
    header.className = 'plan-week-col-header';
    const name = document.createElement('span');
    name.textContent = label;
    const count = document.createElement('span');
    count.className = 'plan-week-col-count';
    count.textContent = dayRows.length;
    header.append(name, count);

    const list = document.createElement('div');
    list.className = 'plan-week-col-list';
    if (dayRows.length) dayRows.forEach(tr => list.appendChild(buildWeekCard(tr)));
    else {
      const empty = document.createElement('p');
      empty.className = 'plan-week-col-empty';
      empty.textContent = 'Sin tareas';
      list.appendChild(empty);
    }

    col.append(header, list);
    planWeekBoard.appendChild(col);
  });
}

// Drag & drop en el tablero: mover una tarjeta a otro día cambia su día de la semana;
// dentro del mismo día, reordena.
let weekDragCard = null;

function clearWeekDropTargets() {
  planWeekBoard.querySelectorAll('.plan-week-col--drop-target').forEach(c => c.classList.remove('plan-week-col--drop-target'));
}

planWeekBoard.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.plan-week-card');
  if (!card) return;
  weekDragCard = card;
  card.classList.add('plan-week-card--dragging');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id ?? '');
  }
});

planWeekBoard.addEventListener('dragover', (e) => {
  if (!weekDragCard) return;
  const col = e.target.closest('.plan-week-col');
  if (!col) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  if (!col.classList.contains('plan-week-col--drop-target')) {
    clearWeekDropTargets();
    col.classList.add('plan-week-col--drop-target');
  }
  // Coloca la tarjeta en su posición provisional según la altura del cursor
  const list = col.querySelector('.plan-week-col-list');
  const next = Array.from(list.querySelectorAll('.plan-week-card'))
    .filter(c => c !== weekDragCard)
    .find(c => {
      const r = c.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
  if (next) {
    if (weekDragCard.nextElementSibling !== next) list.insertBefore(weekDragCard, next);
  } else if (list.lastElementChild !== weekDragCard) {
    list.appendChild(weekDragCard);
  }
});

planWeekBoard.addEventListener('drop', (e) => {
  if (!weekDragCard) return;
  const col = weekDragCard.closest('.plan-week-col');
  if (!col) return;
  e.preventDefault();

  const tr = detailTaskList.querySelector(`[data-id="${weekDragCard.dataset.id}"]`);
  if (!tr) return;
  const rowOf = (card) => card?.classList.contains('plan-week-card')
    ? detailTaskList.querySelector(`[data-id="${card.dataset.id}"]`)
    : null;
  const prevTr = rowOf(weekDragCard.previousElementSibling);
  const nextTr = rowOf(weekDragCard.nextElementSibling);

  // Orden entre los vecinos visibles; saveDetailTasks lo normaliza a enteros
  if (prevTr && nextTr) tr.dataset.order = (detailOrderValue(prevTr) + detailOrderValue(nextTr)) / 2;
  else if (prevTr)      tr.dataset.order = detailOrderValue(prevTr) + 0.5;
  else if (nextTr)      tr.dataset.order = detailOrderValue(nextTr) - 0.5;

  const day = col.dataset.day;
  const repeatEl = tr.querySelector('.detail-task-repeat');
  repeatEl.dataset.weekday = day;
  repeatEl.textContent = `Todos los ${weekdayPlurals[day]}`;

  // Si la tarea está abierta en el panel de edición, refleja el nuevo día
  if (editingId === tr.dataset.id) {
    editWeekday.value = day;
    if (editAlternaTareas.checked) populateLinkedTasksList();
  }

  sortDetailTaskList();
  saveDetailTasks();
});

planWeekBoard.addEventListener('dragend', () => {
  if (!weekDragCard) return;
  weekDragCard.classList.remove('plan-week-card--dragging');
  weekDragCard = null;
  clearWeekDropTargets();
  // Re-render siempre: tras soltar actualiza contadores; si se canceló, restaura
  applyDetailFilter();
});

function syncWeekCardSelection() {
  planWeekBoard.querySelectorAll('.plan-week-card').forEach(card => {
    card.classList.toggle('plan-week-card--selected', card.dataset.id === editingId);
  });
}

function setPlanOwnerFilter(owner) {
  planFilters.owner = owner;
  savePlanFilters();
  syncPlanFilterControls();
  applyDetailFilter();
}

planFilterOwner.addEventListener('change', () => setPlanOwnerFilter(planFilterOwner.value));

function setPlanCategoryFilter(category) {
  planFilters.category = category;
  savePlanFilters();
  syncPlanFilterControls();
  applyDetailFilter();
}

planFilterCategory.addEventListener('change', () => setPlanCategoryFilter(planFilterCategory.value));

planFilterClear.addEventListener('click', () => {
  planFilters = { owner: '', category: '' };
  savePlanFilters();
  syncPlanFilterControls();
  applyDetailFilter();
});

document.querySelectorAll('.plan-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    detailFilter = btn.dataset.filter;
    try { localStorage.setItem('plan-tab', detailFilter); } catch {}
    document.querySelectorAll('.plan-tab').forEach(b => b.classList.remove('plan-tab--active'));
    btn.classList.add('plan-tab--active');
    applyDetailFilter();
  });
});

function updateDetailEmptyState() {
  const visible = Array.from(detailTaskList.children).filter(tr => !tr.hidden).length;
  detailEmptyState.hidden = visible > 0;
  detailEmptyStateText.textContent = detailTaskList.children.length
    ? 'Ninguna tarea coincide con los filtros.'
    : 'No hay tareas planificadas todavía.';
}


const categoryNames = {
  cocina:       'Cocina',
  limpieza:     'Limpieza',
  compras:      'Compras',
  lavanderia:   'Lavandería',
  residuos:     'Gestión de residuos',
  'calidad-aire': 'Calidad del aire',
  equipamiento: 'Equipamiento',
  coche:        'Coche',
  orden:        'Orden',
  mantenimiento: 'Mantenimiento',
  finanzas:     'Finanzas',
};

const detailCategory = document.getElementById('detail-category');
const editCategory   = document.getElementById('edit-category');

// Rellena los selects de categoría (crear y editar) desde categoryNames
[detailCategory, editCategory].forEach(select => {
  select.appendChild(new Option('Sin categoría', ''));
  Object.entries(categoryNames).forEach(([value, label]) => select.appendChild(new Option(label, value)));
});

const ownerMeta = {
  cristina: { label: 'Cristina', initial: 'C', color: '#7c3aed' },
  fernando: { label: 'Fernando', initial: 'F', color: '#2563eb' },
};

// Celda de categoría en la tabla: clic en la categoría → filtra por ella
function renderCategoryCell(cell, category) {
  cell.innerHTML = '';
  if (!categoryNames[category]) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'detail-task-cat-link';
  btn.textContent = categoryNames[category];
  btn.title = `Filtrar por ${categoryNames[category]}`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // no abrir el panel de edición
    setPlanCategoryFilter(category);
  });
  cell.appendChild(btn);
}

// Opciones de los filtros de Planificadas
Object.entries(ownerMeta).forEach(([value, { label }]) => planFilterOwner.appendChild(new Option(label, value)));
planFilterCategory.appendChild(new Option('Sin categoría', NO_CATEGORY));
Object.entries(categoryNames).forEach(([value, label]) => planFilterCategory.appendChild(new Option(label, value)));
syncPlanFilterControls();

function buildOwnerAvatar(owner) {
  const meta = ownerMeta[owner] ?? ownerMeta.cristina;
  const wrap = document.createElement('span');
  wrap.className = 'owner-cell';

  const avatar = document.createElement('span');
  avatar.className = 'owner-avatar';
  avatar.textContent = meta.initial;

  const name = document.createElement('span');
  name.textContent = meta.label;

  wrap.append(avatar, name);
  return wrap;
}

// Celda de responsable en la tabla: clic en el responsable → filtra por él
function renderOwnerCell(cell, owner) {
  const key = ownerMeta[owner] ? owner : 'cristina';
  cell.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'detail-task-owner-link';
  btn.title = `Filtrar por ${ownerMeta[key].label}`;
  btn.appendChild(buildOwnerAvatar(key));
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // no abrir el panel de edición
    setPlanOwnerFilter(key);
  });
  cell.appendChild(btn);
}

function addDetailTask(title, date, repeat = 'daily', weekday = '', id = null, description = '', subtasks = [], owner = 'cristina', link = '', checklistState = [], save = true, alternaTareas = false, linkedTasks = [], enabled = true, order = null, category = '') {
  const trimmed = title.trim();
  if (!trimmed) return;

  const tr = document.createElement('tr');
  tr.className = 'detail-task-item';
  if (!enabled) tr.classList.add('detail-task-item--disabled');
  tr.dataset.enabled = enabled ? 'true' : 'false';
  tr.dataset.order = order ?? Date.now();
  tr.dataset.id = id ?? Date.now().toString();
  if (date) tr.dataset.date = date;
  if (description) tr.dataset.description = description;
  if (subtasks?.length) tr.dataset.subtasks = JSON.stringify(subtasks);
  if (owner) tr.dataset.owner = owner;
  if (link)  tr.dataset.link  = link;
  if (checklistState?.length) tr.dataset.checklistState = JSON.stringify(checklistState);
  tr.dataset.alternaTareas = alternaTareas ? 'true' : 'false';
  if (category) tr.dataset.category = category;
  if (linkedTasks?.length) tr.dataset.linkedTasks = JSON.stringify(linkedTasks);

  const dragCell = document.createElement('td');
  dragCell.className = 'detail-task-drag-cell';
  const dragHandle = document.createElement('span');
  dragHandle.className = 'detail-task-drag-handle';
  dragHandle.textContent = '⠿';
  dragHandle.title = 'Arrastra para reordenar';
  dragHandle.setAttribute('draggable', 'true');
  dragCell.appendChild(dragHandle);
  dragHandle.addEventListener('click', (e) => e.stopPropagation());
  dragHandle.addEventListener('dragstart', (e) => {
    detailDragRow = tr;
    detailDropped = false;
    tr.classList.add('detail-task-item--dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tr.dataset.id ?? '');
    }
  });
  dragHandle.addEventListener('dragend', () => {
    tr.classList.remove('detail-task-item--dragging');
    if (!detailDropped) sortDetailTaskList(); // cancelado: restaura el orden guardado
    detailDragRow = null;
  });

  const toggleCell = document.createElement('td');
  toggleCell.className = 'detail-task-toggle-cell';
  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'toggle-switch';
  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.checked = enabled;
  const toggleTrack = document.createElement('span');
  toggleTrack.className = 'toggle-track';
  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleTrack);
  toggleCell.appendChild(toggleLabel);
  toggleLabel.addEventListener('click', (e) => e.stopPropagation());
  toggleInput.addEventListener('change', () => {
    tr.dataset.enabled = toggleInput.checked ? 'true' : 'false';
    tr.classList.toggle('detail-task-item--disabled', !toggleInput.checked);
    saveDetailTasks();
  });

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

  tr.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) return;
    if (e.target.closest('.detail-task-toggle-cell')) return;
    if (e.target.closest('.detail-task-drag-cell')) return;
    editingId = tr.dataset.id;
    const rEl = tr.querySelector('.detail-task-repeat');
    editTitle.value    = tr.querySelector('.detail-task-title').textContent;
    editCategory.value = tr.dataset.category ?? '';
    editDate.value     = tr.dataset.date ?? '';
    editRepeat.value   = rEl?.dataset.value ?? 'daily';
    editWeekday.value  = rEl?.dataset.weekday || '1';
    editWeekdayGroup.hidden = editRepeat.value !== 'weekly';
    const isAlternaCompatible = alternaRepeatValues.has(editRepeat.value);
    editAlternaTareasGroup.hidden = !isAlternaCompatible;
    editAlternaTareas.checked = isAlternaCompatible && tr.dataset.alternaTareas === 'true';
    if (editAlternaTareas.checked) {
      populateLinkedTasksList();
      editLinkedTasksGroup.hidden = false;
    } else {
      editLinkedTasksGroup.hidden = true;
    }
    openEditPanel();
  });

  const ownerCell = document.createElement('td');
  ownerCell.className = 'detail-task-owner-cell';
  renderOwnerCell(ownerCell, owner);

  const alternaCell = document.createElement('td');
  alternaCell.className = 'detail-task-alterna-cell';
  alternaCell.textContent = alternaTareas ? 'Sí' : 'No';

  const catCell = document.createElement('td');
  catCell.className = 'detail-task-cat-cell';
  renderCategoryCell(catCell, category);

  tr.appendChild(dragCell);
  tr.appendChild(toggleCell);
  tr.appendChild(nameCell);
  tr.appendChild(ownerCell);
  tr.appendChild(repeatCell);
  tr.appendChild(dateCell);
  tr.appendChild(alternaCell);
  tr.appendChild(catCell);
  detailTaskList.appendChild(tr);
  if (save) sortDetailTaskList();

  if (save) applyDetailFilter();
  else updateDetailEmptyState();
  if (save) saveDetailTasks();
}

const repeatOrder  = { daily: 0, weekly: 1, monthly: 2, quarterly: 3, yearly: 4, biannually: 5 };
const weekdayOrder = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '0': 6 };

function detailOrderValue(tr) {
  const v = parseFloat(tr.dataset.order);
  return Number.isNaN(v) ? Number.MAX_SAFE_INTEGER : v;
}

// Clave de grupo dentro del cual se permite reordenar con drag & drop.
// Mismo tipo de repetición; en semanales, además el mismo día.
function detailGroupKey(tr) {
  const rEl = tr.querySelector('.detail-task-repeat');
  const repeat = rEl?.dataset.value ?? 'daily';
  const weekday = repeat === 'weekly' ? (rEl?.dataset.weekday ?? '') : '';
  return `${repeat}|${weekday}`;
}

function sortDetailTaskList() {
  Array.from(detailTaskList.querySelectorAll('.detail-task-item'))
    .sort((a, b) => {
      const rA = a.querySelector('.detail-task-repeat')?.dataset.value ?? 'daily';
      const rB = b.querySelector('.detail-task-repeat')?.dataset.value ?? 'daily';
      const ro = (repeatOrder[rA] ?? 99) - (repeatOrder[rB] ?? 99);
      if (ro !== 0) return ro;
      if (rA === 'weekly') {
        const wA = weekdayOrder[a.querySelector('.detail-task-repeat')?.dataset.weekday ?? '0'] ?? 6;
        const wB = weekdayOrder[b.querySelector('.detail-task-repeat')?.dataset.weekday ?? '0'] ?? 6;
        if (wA !== wB) return wA - wB;
      }
      return detailOrderValue(a) - detailOrderValue(b);
    })
    .forEach(tr => detailTaskList.appendChild(tr));
}

// --- Drag & drop de tareas planificadas (reordena dentro del mismo grupo) ---
let detailDragRow = null;
let detailDropped = false;

detailTaskList.addEventListener('dragover', (e) => {
  if (!detailDragRow) return;
  e.preventDefault(); // imprescindible para que se dispare el 'drop' al soltar
  const overRow = e.target.closest?.('.detail-task-item');
  if (!overRow || overRow === detailDragRow) return;
  if (detailGroupKey(overRow) !== detailGroupKey(detailDragRow)) return; // solo dentro del grupo
  const rect = overRow.getBoundingClientRect();
  const before = (e.clientY - rect.top) < rect.height / 2;
  detailTaskList.insertBefore(detailDragRow, before ? overRow : overRow.nextSibling);
});

detailTaskList.addEventListener('drop', (e) => {
  if (!detailDragRow) return;
  e.preventDefault();
  detailDropped = true;
  saveDetailTasks(); // renumera el orden según la posición actual
});

function alternaTaskShouldAppear(id, rawLinkedIds, log, occurrenceDate) {
  const linkedIds = rawLinkedIds.filter(lid => detailTaskList.querySelector(`[data-id="${lid}"]`));
  if (linkedIds.length === 0) return true;

  // Si alguna tarea del grupo ya ocupó esta ocurrencia (este miércoles), ceder el turno
  if (linkedIds.some(lid => log[lid] === occurrenceDate)) return false;

  // Round-robin: aparece la tarea que lleva más tiempo sin aparecer
  const group = [id, ...linkedIds];
  const turnId = group.reduce((oldest, taskId) => {
    const dateOldest = log[oldest] ?? '';
    const dateThis   = log[taskId] ?? '';
    return dateThis < dateOldest ? taskId : oldest;
  });

  return id === turnId;
}

// Fecha (YYYY-MM-DD) de la última vez que ocurrió targetWeekday, contando hoy hacia atrás.
function lastWeekdayOccurrence(todayStrVal, todayWeekday, targetWeekday) {
  const back = (parseInt(todayWeekday, 10) - parseInt(targetWeekday, 10) + 7) % 7;
  const d = new Date(todayStrVal);
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

function syncRecurringTasks() {
  const today = todayStr();
  lastSyncDate = today; // marca el día ya sincronizado (evita re-ejecuciones el mismo día)
  const todayWeekday = new Date().getDay().toString();
  const log = dailyLog; // registro compartido en Firebase
  let logUpdated = false;
  let needsDetailSave = false;

  detailTaskList.querySelectorAll('.detail-task-item').forEach(li => {
    const id = li.dataset.id;
    const repeatEl = li.querySelector('.detail-task-repeat');
    const repeat   = repeatEl?.dataset.value;
    const weekday  = repeatEl?.dataset.weekday ?? '';
    const startDate = li.dataset.date ?? '';

    if (li.dataset.enabled === 'false') return; // tarea desactivada: no se añade a las listas
    if (!['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'biannually'].includes(repeat)) return;
    if (startDate && startDate > today) return;
    if (log[id] === today) return;
    // Fecha con la que se añadirá la tarea: por defecto hoy, salvo recuperación semanal.
    let addedDate = today;
    if (repeat === 'weekly') {
      if (!weekday) return;
      // Última ocurrencia de ese día (hoy o ya pasada). Si no se añadió entonces, se recupera ahora.
      const occ = lastWeekdayOccurrence(today, todayWeekday, weekday);
      if (startDate && startDate > occ) return; // la ocurrencia es anterior al inicio de la tarea
      if ((log[id] ?? '') >= occ) return;       // ya se añadió en esa ocurrencia (o posterior)
      addedDate = occ;                          // conserva la fecha del día en que debía crearse
    }
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

    if (li.dataset.alternaTareas === 'true') {
      const rawLinkedIds = li.dataset.linkedTasks ? JSON.parse(li.dataset.linkedTasks) : [];
      if (!alternaTaskShouldAppear(id, rawLinkedIds, log, addedDate)) return;
    }

    // Ya hay una tarea de esta serie sin completar → no acumular otra.
    const pendingExists = Array.from(taskList.querySelectorAll('.task-item:not(.done)')).some(
      task => task.dataset.seriesId === id
    );
    // Esta ocurrencia (misma serie y misma fecha) ya se creó y se completó → no re-añadirla.
    const occurrenceDone = Array.from(completedList.querySelectorAll('.task-item')).some(
      task => task.dataset.seriesId === id
        && task.querySelector('.task-byline')?.dataset.addedDate === addedDate
    );
    if (pendingExists || occurrenceDone) return;

    addTask(li.querySelector('.detail-task-title').textContent, false, { addedDate, repeat, weekday, seriesId: id, owner: li.dataset.owner ?? 'cristina' });
    log[id] = addedDate; // registra la fecha de la ocurrencia (no la de recarga)
    logUpdated = true;
    if (li.dataset.checklistState && JSON.parse(li.dataset.checklistState).length) {
      li.dataset.checklistState = '[]';
      needsDetailSave = true;
    }
  });

  if (logUpdated) db.ref('daily-log').set(log);
  if (needsDetailSave) saveDetailTasks();
}

const detailOwner     = document.getElementById('detail-owner');
const editOwner       = document.getElementById('edit-owner');

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
  detailOwner.value    = 'cristina';
  detailCategory.value = '';
  weekdayGroup.hidden  = true;
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
    '',
    [],
    detailOwner.value,
    '',
    [],
    true,
    false,
    [],
    true,
    null,
    detailCategory.value
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
  document.querySelectorAll('.task-item--active').forEach(el => el.classList.remove('task-item--active'));
  hoyActiveLi = li;
  li.classList.add('task-item--active');

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
    dateWrap.classList.toggle('task-byline--past', date < todayStr());
  } else {
    dateWrap.hidden = true;
    dateWrap.classList.remove('task-byline--past');
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
  if (hoyActiveLi) hoyActiveLi.classList.remove('task-item--active');
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
  if (!editMenuDropdown.hidden) editMenuDropdown.hidden = true;
});

document.getElementById('hoy-panel-complete-btn').addEventListener('click', () => {
  if (!hoyActiveLi) return;
  hoyActiveLi.classList.add('done');
  completedList.appendChild(hoyActiveLi);
  closeHoyPanel();
  updateEmptyState();
  updateCompletedSection();
  saveTasks();
});

hoyPanelDeleteBtn.addEventListener('click', () => {
  if (!hoyActiveLi) return;
  if (!confirm('¿Eliminar esta tarea?')) return;
  hoyActiveLi.remove();
  closeHoyPanel();
  updateEmptyState();
  updateCompletedSection();
  saveTasks();
});

// --- Panel lateral (editar tarea) ---
const editPanel        = document.getElementById('edit-panel');
const editPanelClose   = document.getElementById('edit-panel-close');
const editMenuBtn      = document.getElementById('edit-menu-btn');
const editMenuDropdown = document.getElementById('edit-menu-dropdown');
const editForm         = document.getElementById('edit-task-form');
const editTitle        = document.getElementById('edit-title');
const editDate         = document.getElementById('edit-date');
const editRepeat       = document.getElementById('edit-repeat');
const editWeekday      = document.getElementById('edit-weekday');
const editWeekdayGroup = document.getElementById('edit-weekday-group');
const editAlternaTareas      = document.getElementById('edit-alterna-tareas');
const editAlternaTareasGroup = document.getElementById('edit-alterna-tareas-group');
const editLinkedTasksGroup   = document.getElementById('edit-linked-tasks-group');
const editLinkedTasksList    = document.getElementById('edit-linked-tasks-list');

const alternaRepeatValues = new Set(['daily', 'weekly']);

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

// --- Menciones de materiales en la descripción ---
// Se declara aquí (y no en la sección Materiales) porque el blot la consulta
// al pintar cualquier descripción.
let materialesItems = [];

const MAT_TYPES = {
  'utensilio':  { label: 'Utensilios',  singular: 'Utensilio',  color: '#6b6b76' },
  'consumible': { label: 'Consumibles', singular: 'Consumible', color: '#d97706' },
};

// Mención = embed en línea que guarda id, nombre y tipo. Al pintarse toma el
// nombre actual del material (por si se renombró); si ya no existe, conserva
// el nombre guardado y se marca como eliminado.
const QuillEmbed = Quill.import('blots/embed');
class MentionBlot extends QuillEmbed {
  static create(value) {
    const node = super.create();
    const item = materialesItems.find(m => m.id === value.id);
    const nombre = item?.nombre ?? value.nombre ?? '';
    const tipo   = item?.tipo ?? value.tipo ?? '';
    node.dataset.id = value.id ?? '';
    node.dataset.nombre = nombre;
    node.dataset.tipo = tipo;
    if (!item) node.classList.add('mention--missing');
    node.textContent = `@${nombre}`;
    return node;
  }

  static value(node) {
    return { id: node.dataset.id, nombre: node.dataset.nombre, tipo: node.dataset.tipo };
  }
}
MentionBlot.blotName  = 'mention';
MentionBlot.tagName   = 'SPAN';
MentionBlot.className = 'mention';
Quill.register(MentionBlot);

const quill    = new Quill('#description-editor',  quillOptions);
const hoyQuill = new Quill('#hoy-panel-desc-editor', {
  theme: 'bubble',
  readOnly: true,
  modules: { toolbar: false },
});

// Autocompletado: al escribir «@» en la descripción aparece una lista de
// materiales filtrada por lo que se escribe a continuación.
const mentionMenu = document.createElement('div');
mentionMenu.className = 'mention-menu';
mentionMenu.hidden = true;
quill.container.appendChild(mentionMenu);

let mentionAt      = null; // índice del «@» en el documento
let mentionMatches = [];
let mentionActive  = 0;

function normalizeText(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function closeMentionMenu() {
  mentionMenu.hidden = true;
  mentionAt = null;
  mentionMatches = [];
}

function renderMentionMenu() {
  mentionMenu.innerHTML = '';
  mentionMatches.forEach((item, i) => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'mention-option' + (i === mentionActive ? ' mention-option--active' : '');
    const dot = document.createElement('span');
    dot.className = 'mention-option-dot';
    dot.style.setProperty('--mat-color', MAT_TYPES[item.tipo]?.color);
    const name = document.createElement('span');
    name.className = 'mention-option-name';
    name.textContent = item.nombre;
    const type = document.createElement('span');
    type.className = 'mention-option-type';
    type.textContent = MAT_TYPES[item.tipo]?.singular ?? '';
    opt.append(dot, name, type);
    // mousedown + preventDefault: el editor no pierde el foco ni la selección
    opt.addEventListener('mousedown', (e) => { e.preventDefault(); insertMention(item); });
    mentionMenu.appendChild(opt);
  });
}

function updateMentionMenu() {
  const sel = quill.getSelection();
  if (!sel || sel.length) { closeMentionMenu(); return; }

  // Busca el «@» más cercano en la línea actual, al inicio o tras un espacio.
  const [line, offset] = quill.getLine(sel.index);
  if (!line) { closeMentionMenu(); return; }
  const lineStart = sel.index - offset;
  // getText omite los embeds; con un carácter de relleno los índices cuadran.
  const before = quill.getContents(lineStart, offset).ops
    .map(op => typeof op.insert === 'string' ? op.insert : '￼').join('');
  const at = before.lastIndexOf('@');
  if (at === -1 || (at > 0 && !/\s/.test(before[at - 1]))) { closeMentionMenu(); return; }

  const query = normalizeText(before.slice(at + 1));
  if (query.length > 40) { closeMentionMenu(); return; }

  const matches = materialesItems
    .filter(m => normalizeText(m.nombre).includes(query))
    .sort((a, b) => {
      const as = normalizeText(a.nombre).startsWith(query) ? 0 : 1;
      const bs = normalizeText(b.nombre).startsWith(query) ? 0 : 1;
      return as - bs || a.nombre.localeCompare(b.nombre, 'es');
    })
    .slice(0, 8);
  if (!matches.length) { closeMentionMenu(); return; }

  const newAt = lineStart + at;
  if (newAt !== mentionAt) mentionActive = 0;
  mentionAt = newAt;
  mentionMatches = matches;
  mentionActive = Math.min(mentionActive, matches.length - 1);
  renderMentionMenu();

  const bounds = quill.getBounds(mentionAt);
  mentionMenu.style.top  = `${bounds.bottom + 4}px`;
  mentionMenu.style.left = `${Math.max(0, bounds.left)}px`;
  mentionMenu.hidden = false;
}

function insertMention(item) {
  if (mentionAt === null) return;
  const sel = quill.getSelection(true);
  const at = mentionAt;
  closeMentionMenu();
  quill.deleteText(at, sel.index - at, Quill.sources.USER);
  quill.insertEmbed(at, 'mention', { id: item.id, nombre: item.nombre, tipo: item.tipo }, Quill.sources.USER);
  quill.insertText(at + 1, ' ', Quill.sources.USER);
  quill.setSelection(at + 2, 0, Quill.sources.USER);
}

// Solo reacciona a lo que hace la usuaria, no a los pegados programáticos
// (en text-change y selection-change el origen es el tercer argumento).
quill.on('editor-change', (eventName, _a, _b, source) => {
  if (source !== Quill.sources.USER) { closeMentionMenu(); return; }
  updateMentionMenu();
});

// Captura: se adelanta al módulo de teclado de Quill (Enter, flechas) y al
// Escape global que cierra el panel.
quill.root.addEventListener('keydown', (e) => {
  if (mentionMenu.hidden) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const step = e.key === 'ArrowDown' ? 1 : -1;
    mentionActive = (mentionActive + step + mentionMatches.length) % mentionMatches.length;
    renderMentionMenu();
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    insertMention(mentionMatches[mentionActive]);
  } else if (e.key === 'Escape') {
    closeMentionMenu();
  } else {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
}, true);

quill.root.addEventListener('blur', closeMentionMenu);

// Intercepta taps/clics en checkboxes del panel Hoy antes de que Quill los procese.
// Quill revierte síncronamente cualquier toggle del DOM, así que hay que actualizar
// su modelo interno via formatLine para que el cambio sea permanente.
// Usamos mousedown (desktop) y touchstart (móvil) en vez de click, porque en Chrome
// con file:// el evento click sobre ::before no siempre llega a document sin DevTools.
function _handleCheckboxToggle(e) {
  if (!hoyActivePlanLi) return;
  const li = e.target.closest('li');
  if (!li || !hoyQuill.root.contains(li)) return;
  const ul = li.closest('ul[data-checked]');
  if (!ul) return;

  // Tomamos control total: Quill no debe procesar este evento
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const wasChecked = ul.dataset.checked === 'true';
  const newListValue = wasChecked ? 'unchecked' : 'checked';

  // Actualizar el modelo de Quill (no solo el DOM) para que el toggle sea permanente
  const blot = Quill.find(li);
  if (blot) {
    const index = hoyQuill.getIndex(blot);
    hoyQuill.enable(true);
    hoyQuill.formatLine(index, 1, 'list', newListValue, Quill.sources.USER);
    hoyQuill.enable(false);
  } else {
    // Fallback: modificar el atributo directamente
    ul.dataset.checked = wasChecked ? 'false' : 'true';
  }

  // Leer el estado resultante del DOM y persistir
  const allLis = Array.from(hoyQuill.root.querySelectorAll('ul[data-checked] > li'));
  if (!allLis.length) return;
  const newState = allLis.map(l => l.closest('ul[data-checked]').dataset.checked === 'true');

  hoyActivePlanLi.dataset.checklistState = JSON.stringify(newState);
  const taskId = hoyActivePlanLi.dataset.id;
  const livePlanLi = detailTaskList.querySelector(`[data-id="${taskId}"]`);
  if (livePlanLi) {
    livePlanLi.dataset.checklistState = JSON.stringify(newState);
    hoyActivePlanLi = livePlanLi;
  }
  saveDetailTasks();
}

document.addEventListener('mousedown',  _handleCheckboxToggle, { capture: true, passive: false });
document.addEventListener('touchstart', _handleCheckboxToggle, { capture: true, passive: false });

// En el formulario de edición los checkboxes no se pueden marcar: solo se marcan
// en la ocurrencia (panel Hoy). Quill escucha mousedown/touchstart en cada <ul>
// para alternarlos; cortamos la propagación en la raíz (fase de captura) sin
// preventDefault, así el cursor se sigue colocando con normalidad.
function _blockEditCheckboxToggle(e) {
  if (e.target.closest?.('ul[data-checked] > li')) e.stopPropagation();
}
quill.root.addEventListener('mousedown',  _blockEditCheckboxToggle, true);
quill.root.addEventListener('touchstart', _blockEditCheckboxToggle, true);

// Descripción tal y como se muestra/guarda desde el formulario: checkboxes vacíos.
function uncheckAll(html) {
  return html.replace(/data-checked="true"/g, 'data-checked="false"');
}

let editingId = null;

function openEditPanel() {
  const li = detailTaskList.querySelector(`[data-id="${editingId}"]`);
  const desc = li?.dataset.description ?? '';
  quill.clipboard.dangerouslyPasteHTML(uncheckAll(desc));
  editOwner.value = li?.dataset.owner ?? 'cristina';
  detailTaskList.querySelectorAll('.detail-task-item--selected').forEach(tr => tr.classList.remove('detail-task-item--selected'));
  if (li) li.classList.add('detail-task-item--selected');
  syncWeekCardSelection();
  editPanel.classList.add('open');
  editTitle.focus();
}

function closeEditPanel() {
  closeDescModal();
  editPanel.classList.remove('open');
  editMenuDropdown.hidden = true;
  detailTaskList.querySelectorAll('.detail-task-item--selected').forEach(tr => tr.classList.remove('detail-task-item--selected'));
  editingId = null;
  syncWeekCardSelection();
}

editPanelClose.addEventListener('click', closeEditPanel);

// --- Descripción ampliada ---
// Se mueve el mismo editor (no una copia) al modal: así siguen funcionando el
// autoguardado, las menciones y el bloqueo de checkboxes sin duplicar nada.
// Los elementos se buscan dentro de las funciones porque closeEditPanel puede
// llamarse antes de que esta parte del script se haya evaluado.
function openDescModal() {
  if (!editingId) return;
  const modal = document.getElementById('desc-modal');
  document.getElementById('desc-modal-title').textContent = editTitle.value.trim() || 'Sin título';
  closeMentionMenu();
  document.getElementById('desc-modal-slot').appendChild(quill.container);
  modal.hidden = false;
  document.body.classList.add('rp-modal-open');
  quill.focus();
}

function closeDescModal() {
  const modal = document.getElementById('desc-modal');
  if (!modal || modal.hidden) return;
  closeMentionMenu();
  document.getElementById('description-home').appendChild(quill.container);
  modal.hidden = true;
  document.body.classList.remove('rp-modal-open');
}

document.getElementById('desc-expand-btn').addEventListener('click', openDescModal);
document.getElementById('desc-modal-close').addEventListener('click', closeDescModal);
document.getElementById('desc-modal-backdrop').addEventListener('click', closeDescModal);
// Clic en el margen del modal (fuera del texto): lleva el cursor al editor.
document.getElementById('desc-modal-slot').addEventListener('mousedown', (e) => {
  if (e.target !== e.currentTarget) return;
  e.preventDefault();
  quill.focus();
});

// Escape con el modal abierto: cierra solo el modal (no el panel de edición).
// Si está abierta la lista de «@», Escape la cierra a ella primero.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || document.getElementById('desc-modal').hidden || !mentionMenu.hidden) return;
  e.stopPropagation();
  closeDescModal();
}, true);
editMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  editMenuDropdown.hidden = !editMenuDropdown.hidden;
});

document.getElementById('edit-panel-delete-btn').addEventListener('click', () => {
  if (!confirm('¿Eliminar esta tarea?')) return;
  const li = detailTaskList.querySelector(`[data-id="${editingId}"]`);
  if (!li) return;
  li.remove();
  closeEditPanel();
  applyDetailFilter();
  saveDetailTasks();
});
editRepeat.addEventListener('change', () => {
  editWeekdayGroup.hidden = editRepeat.value !== 'weekly';
  const compatible = alternaRepeatValues.has(editRepeat.value);
  editAlternaTareasGroup.hidden = !compatible;
  if (!compatible && editAlternaTareas.checked) {
    editAlternaTareas.checked = false;
    clearLinkedTasks();
    editLinkedTasksGroup.hidden = true;
    saveDetailTasks();
  } else if (compatible && editAlternaTareas.checked) {
    populateLinkedTasksList();
  }
});
editWeekday.addEventListener('change', () => {
  if (editAlternaTareas.checked) populateLinkedTasksList();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!planModalOverlay.hidden) closePlanModal();
    else if (hoyDetailPanel.classList.contains('open')) closeHoyPanel();
    else closeEditPanel();
  }
});

function clearLinkedTasks() {
  const currentTr = detailTaskList.querySelector(`[data-id="${editingId}"]`);
  if (!currentTr) return;
  const linked = currentTr.dataset.linkedTasks ? JSON.parse(currentTr.dataset.linkedTasks) : [];
  linked.forEach(linkedId => {
    const linkedTr = detailTaskList.querySelector(`[data-id="${linkedId}"]`);
    if (!linkedTr) return;
    let linkedLinked = linkedTr.dataset.linkedTasks ? JSON.parse(linkedTr.dataset.linkedTasks) : [];
    linkedLinked = linkedLinked.filter(id => id !== editingId);
    linkedTr.dataset.linkedTasks = JSON.stringify(linkedLinked);
    if (linkedLinked.length === 0) linkedTr.dataset.alternaTareas = 'false';
  });
  currentTr.dataset.linkedTasks = JSON.stringify([]);
}

function populateLinkedTasksList() {
  const currentId     = editingId;
  const currentRepeat = editRepeat.value;
  const currentWeekday = currentRepeat === 'weekly' ? editWeekday.value : '';
  const currentTr     = detailTaskList.querySelector(`[data-id="${currentId}"]`);
  const linked        = currentTr?.dataset.linkedTasks ? JSON.parse(currentTr.dataset.linkedTasks) : [];

  const compatible = Array.from(detailTaskList.querySelectorAll('.detail-task-item')).filter(tr => {
    if (tr.dataset.id === currentId) return false;
    const repeatEl = tr.querySelector('.detail-task-repeat');
    const repeat   = repeatEl?.dataset.value ?? '';
    const weekday  = repeatEl?.dataset.weekday ?? '';
    if (repeat !== currentRepeat) return false;
    if (currentRepeat === 'weekly' && weekday !== currentWeekday) return false;
    return true;
  });

  editLinkedTasksList.innerHTML = '';
  if (compatible.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'linked-tasks-empty';
    empty.textContent = 'No hay tareas con la misma repetición.';
    editLinkedTasksList.appendChild(empty);
    return;
  }

  compatible.forEach(taskTr => {
    const taskId = taskTr.dataset.id;
    const title  = taskTr.querySelector('.detail-task-title').textContent;

    const item = document.createElement('label');
    item.className = 'linked-task-item';

    const checkbox = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.className = 'linked-task-checkbox';
    checkbox.checked   = linked.includes(taskId);

    const span = document.createElement('span');
    span.className   = 'linked-task-label';
    span.textContent = title;

    item.append(checkbox, span);
    editLinkedTasksList.appendChild(item);

    checkbox.addEventListener('change', () => handleLinkedTaskChange(taskId, checkbox.checked));
  });
}

function handleLinkedTaskChange(linkedId, isChecked) {
  const currentTr = detailTaskList.querySelector(`[data-id="${editingId}"]`);
  const linkedTr  = detailTaskList.querySelector(`[data-id="${linkedId}"]`);
  if (!currentTr || !linkedTr) return;

  if (isChecked) currentTr.dataset.alternaTareas = 'true';

  let currentLinked = currentTr.dataset.linkedTasks ? JSON.parse(currentTr.dataset.linkedTasks) : [];
  if (isChecked) {
    if (!currentLinked.includes(linkedId)) currentLinked.push(linkedId);
  } else {
    currentLinked = currentLinked.filter(id => id !== linkedId);
  }
  currentTr.dataset.linkedTasks = JSON.stringify(currentLinked);

  let linkedLinked = linkedTr.dataset.linkedTasks ? JSON.parse(linkedTr.dataset.linkedTasks) : [];
  if (isChecked) {
    linkedTr.dataset.alternaTareas = 'true';
    if (!linkedLinked.includes(editingId)) linkedLinked.push(editingId);
  } else {
    linkedLinked = linkedLinked.filter(id => id !== editingId);
    if (linkedLinked.length === 0) linkedTr.dataset.alternaTareas = 'false';
  }
  linkedTr.dataset.linkedTasks = JSON.stringify(linkedLinked);

  saveDetailTasks();
}

editAlternaTareas.addEventListener('change', () => {
  if (editAlternaTareas.checked) {
    const currentTr = detailTaskList.querySelector(`[data-id="${editingId}"]`);
    if (currentTr) currentTr.dataset.alternaTareas = 'true';
    populateLinkedTasksList();
    editLinkedTasksGroup.hidden = false;
    saveDetailTasks();
  } else {
    clearLinkedTasks();
    editLinkedTasksGroup.hidden = true;
    saveDetailTasks();
  }
});

function applyDetailTaskEdit(id) {
  const tr = detailTaskList.querySelector(`[data-id="${id}"]`);
  if (!tr) return;

  const repeat   = editRepeat.value;
  const weekday  = repeat === 'weekly' ? editWeekday.value : '';
  const date     = editDate.value;

  if (date) tr.dataset.date = date; else delete tr.dataset.date;
  const descHtml = quill.root.innerHTML;
  if (descHtml && descHtml !== '<p><br></p>') tr.dataset.description = descHtml;
  else delete tr.dataset.description;

  tr.dataset.owner = editOwner.value;
  if (editCategory.value) tr.dataset.category = editCategory.value;
  else delete tr.dataset.category;
  tr.dataset.alternaTareas = editAlternaTareas.checked ? 'true' : 'false';
  const ownerCellEl = tr.querySelector('.detail-task-owner-cell');
  renderOwnerCell(ownerCellEl, editOwner.value);

  tr.querySelector('.detail-task-title').textContent = editTitle.value.trim();

  const repeatEl = tr.querySelector('.detail-task-repeat');
  repeatEl.dataset.value = repeat;
  repeatEl.dataset.weekday = weekday;
  repeatEl.textContent = repeat === 'weekly' && weekday
    ? `Todos los ${weekdayPlurals[weekday]}`
    : repeatLabels[repeat] ?? repeat;

  tr.querySelector('.detail-task-date-cell').textContent = formatDate(date);

  tr.querySelector('.detail-task-alterna-cell').textContent = editAlternaTareas.checked ? 'Sí' : 'No';
  renderCategoryCell(tr.querySelector('.detail-task-cat-cell'), editCategory.value);

  sortDetailTaskList();
  applyDetailFilter();
  saveDetailTasks();
}

function autoSave() {
  if (editingId) applyDetailTaskEdit(editingId);
}

let quillSaveTimer = null;
quill.on('text-change', () => {
  clearTimeout(quillSaveTimer);
  quillSaveTimer = setTimeout(autoSave, 500);
});

[editTitle, editCategory, editOwner, editDate, editRepeat, editWeekday].forEach(el => {
  el.addEventListener('change', autoSave);
});

// --- Auth + Firebase real-time listeners ---

let detailReady      = false;
let tasksReady       = false;
let logReady         = false;
let lastSyncDate     = null; // día (YYYY-MM-DD) de la última sincronización de recurrentes
let listenersStarted = false;
let dailyLog         = {}; // registro compartido (Firebase) de ocurrencias ya generadas

// Sincroniza si los datos están listos y aún no se ha sincronizado hoy.
// Sirve tanto para la primera carga como para re-sincronizar al cambiar de día
// con la app abierta (las comprobaciones internas evitan duplicados).
function maybeSyncRecurring() {
  if (detailReady && tasksReady && logReady && lastSyncDate !== todayStr()) {
    syncRecurringTasks();
  }
}

// Con la app abierta en el móvil/PWA, el cambio de día no dispara una recarga.
// Al recuperar el foco o la visibilidad, se comprueba si toca sincronizar.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') maybeSyncRecurring();
});
window.addEventListener('focus', maybeSyncRecurring);

function startFirebaseListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  startRepartoListener();
  startConvivenciaListener();
  startMaterialesListener();

  db.ref('daily-log').on('value', (snapshot) => {
    dailyLog = snapshot.val() ?? {};
    if (!logReady) {
      // Migración única desde localStorage si en Firebase aún no hay registro.
      if (!snapshot.val()) {
        const local = localStorage.getItem('daily-log');
        if (local) {
          const parsed = JSON.parse(local);
          if (Object.keys(parsed).length) {
            dailyLog = parsed;
            db.ref('daily-log').set(parsed);
          }
        }
      }
      localStorage.removeItem('daily-log');
      logReady = true;
      maybeSyncRecurring();
    }
  }, (error) => {
    // Si la lectura de daily-log falla (p. ej. reglas de seguridad de Firebase),
    // no se debe bloquear toda la generación de tareas: se continúa con un
    // registro vacío en memoria. Las comprobaciones pendingExists/occurrenceDone
    // siguen evitando duplicados dentro del día.
    console.error('[sync] Error leyendo daily-log en Firebase:', error?.message ?? error);
    if (!logReady) {
      dailyLog = {};
      logReady = true;
      maybeSyncRecurring();
    }
  });

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
    data.forEach((t, i) => {
      const repeat = (t.repeat === 'never' || !t.repeat) ? 'daily' : t.repeat;
      addDetailTask(t.title, t.date, repeat, t.weekday ?? '', t.id ?? null, t.description ?? '', t.subtasks ?? [], t.owner ?? 'cristina', t.link ?? '', t.checklistState ?? [], false, t.alternaTareas ?? false, t.linkedTasks ?? [], t.enabled ?? true, t.order ?? i, t.category ?? '');
    });
    sortDetailTaskList();
  }
  if (hoyActiveLi?.dataset.seriesId) {
    hoyActivePlanLi = detailTaskList.querySelector(`[data-id="${hoyActiveLi.dataset.seriesId}"]`) ?? null;
  }
  applyDetailFilter();
  updateNavCounts();
  refreshRepartoRoutineOptions();
  renderMateriales(); // columna «Se usa en»

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
          seriesId: t.seriesId, subtasksDone: t.subtasksDone ?? [],
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


// --- Reparto ---------------------------------------------------------------
// Vista con UI propia. La tabla es de solo lectura: al pulsar una fila se abre
// un modal que edita una copia (borrador) y solo confirma al guardar.

const RP_OWNERS = {
  cristina: { label: 'Cristina', initial: 'C', color: '#7c3aed' },
  fernando: { label: 'Fernando', initial: 'F', color: '#2563eb' },
  ambos:    { label: 'Ambos',    initial: 'A', color: '#0d9488' },
};

// 'personalizado' guarda su etiqueta libre en row.frecuenciaPersonalizada.
const RP_FREQS = { diario: 'Diario', semanal: 'Semanal', personalizado: 'Personalizado' };

function rpFreqLabel(row) {
  if (row.frecuencia === 'personalizado') return row.frecuenciaPersonalizada || 'Personalizado';
  return RP_FREQS[row.frecuencia];
}

const rpTabsBar       = document.getElementById('rp-tabs');
const rpSummary       = document.getElementById('rp-summary');
const rpToolbar       = document.getElementById('rp-toolbar');
const rpGroups        = document.getElementById('rp-groups');
const rpGroupTemplate = document.getElementById('rp-group-template');
const rpEmptyCard     = document.getElementById('rp-empty-card');

const rpModal        = document.getElementById('rp-modal');
const rpModalTitle   = document.getElementById('rp-modal-title');
const rpModalTask    = document.getElementById('rp-modal-task');
const rpModalOwner   = document.getElementById('rp-modal-owner');
const rpModalFreq    = document.getElementById('rp-modal-freq');
const rpModalTab     = document.getElementById('rp-modal-tab');
const rpModalSection = document.getElementById('rp-modal-section');
const rpModalRoutine = document.getElementById('rp-modal-routine');
const rpModalSave    = document.getElementById('rp-modal-save');
const rpModalDelete  = document.getElementById('rp-modal-delete');

const rpViewModal = document.getElementById('rp-view-modal');
const rpViewTitle = document.getElementById('rp-view-title');

// Editor de instrucciones: tema snow para tener la barra de formato siempre
// visible (el resto de la app usa bubble, que la oculta hasta seleccionar).
const rpInstrQuill = new Quill('#rp-modal-instructions', {
  theme: 'snow',
  placeholder: 'Pasos, detalles, lo que haga falta…',
  modules: {
    toolbar: [['bold', 'italic'], [{ list: 'ordered' }, { list: 'bullet' }]],
  },
});

// Lector de solo lectura. Se pinta con dangerouslyPasteHTML, que pasa el HTML
// por los conversores de Quill y descarta lo que no sean formatos conocidos.
const rpReaderQuill = new Quill('#rp-view-content', {
  theme: 'bubble',
  readOnly: true,
  modules: { toolbar: false },
});

let repartoRows  = [];
let repartoTabs  = [];     // nombres de pestaña, en orden; se guardan aparte de
                           // las filas porque una pestaña puede estar vacía
let rpActiveTab  = null;
let rpOptionsKey = null;
let rpDraft      = null;   // copia editable de la fila abierta en el modal
let rpEditingId  = null;   // null = fila nueva
let rpLastFocus  = null;   // fila desde la que se abrió el modal
let rpFreqCustomInput = null; // campo libre de la frecuencia personalizada
let rpSectionInput    = null; // campo de nombre al crear una sección
let rpSectionCreating = false;

function rpNewId() {
  return `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rpNormalizeRow(row, i) {
  const r = row ?? {};
  return {
    id: r.id ?? `rp-legacy-${i}`,
    tarea: typeof r.tarea === 'string' ? r.tarea : '',
    pestana: typeof r.pestana === 'string' ? r.pestana.trim() : '',
    seccion: typeof r.seccion === 'string' ? r.seccion.trim() : '',
    responsable: RP_OWNERS[r.responsable] ? r.responsable : 'cristina',
    frecuencia: RP_FREQS[r.frecuencia] ? r.frecuencia : 'diario',
    frecuenciaPersonalizada: typeof r.frecuenciaPersonalizada === 'string' ? r.frecuenciaPersonalizada : '',
    rutina: Array.isArray(r.rutina) ? r.rutina.filter(id => typeof id === 'string') : [],
    instrucciones: typeof r.instrucciones === 'string' ? r.instrucciones : '',
  };
}

// 'General' es la pestaña fija de resumen: nunca aparece en repartoTabs ni
// puede usarse como nombre de una pestaña de datos.
const RP_SUMMARY_TAB = 'General';
const RP_DEFAULT_TAB = 'Tareas';

function rpFreeTabName(base) {
  if (base !== RP_SUMMARY_TAB && !repartoTabs.includes(base)) return base;
  let i = 2;
  while (repartoTabs.includes(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

// El nodo 'reparto' fue un array de filas hasta que aparecieron las pestañas;
// ahora es { rows, tabs }. Aquí se aceptan las dos formas.
function rpParseSnapshot(data) {
  const toList = v => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
  if (Array.isArray(data)) return { rows: data, tabs: [] };
  if (data && typeof data === 'object') {
    if ('rows' in data || 'tabs' in data) {
      return { rows: toList(data.rows), tabs: rpCleanTabs(toList(data.tabs)) };
    }
    return { rows: Object.values(data), tabs: [] }; // array con huecos: Firebase lo devuelve como objeto
  }
  return { rows: [], tabs: [] };
}

function rpCleanTabs(list) {
  const names = list.filter(t => typeof t === 'string').map(t => t.trim()).filter(Boolean);
  return [...new Set(names)];
}

// Garantiza que siempre haya al menos una pestaña y que ninguna fila quede
// huérfana. Devuelve true si ha tenido que tocar algo (hay que persistirlo).
function rpReconcileTabs() {
  let changed = false;
  const clean = rpCleanTabs(repartoTabs);
  if (clean.length !== repartoTabs.length) { repartoTabs = clean; changed = true; }

  repartoRows.forEach(row => {
    if (row.pestana && !repartoTabs.includes(row.pestana)) {
      repartoTabs.push(row.pestana);
      changed = true;
    }
  });

  // Una pestaña de datos llamada 'General' (la creó la migración anterior)
  // cede el nombre a la pestaña fija y se lleva sus filas consigo.
  if (repartoTabs.includes(RP_SUMMARY_TAB)) {
    const free = rpFreeTabName(RP_DEFAULT_TAB);
    repartoTabs = repartoTabs.map(t => (t === RP_SUMMARY_TAB ? free : t));
    repartoRows.forEach(row => { if (row.pestana === RP_SUMMARY_TAB) row.pestana = free; });
    changed = true;
  }

  if (!repartoTabs.length) { repartoTabs = [RP_DEFAULT_TAB]; changed = true; }

  // Filas anteriores a las pestañas: van a la primera.
  const first = repartoTabs[0];
  repartoRows.forEach(row => {
    if (!row.pestana) { row.pestana = first; changed = true; }
  });

  return changed;
}

function rpAllTabs() {
  return [RP_SUMMARY_TAB, ...repartoTabs];
}

function rpEnsureActiveTab() {
  const all = rpAllTabs();
  if (all.includes(rpActiveTab)) return;
  const saved = localStorage.getItem('rp-active-tab');
  rpActiveTab = all.includes(saved) ? saved : all[0];
}

function rpSetActiveTab(name) {
  if (!rpAllTabs().includes(name)) return;
  rpActiveTab = name;
  localStorage.setItem('rp-active-tab', name);
  rpClosePopover();
  renderReparto();
}

function rpTabRows(tab = rpActiveTab) {
  return repartoRows.filter(row => row.pestana === tab);
}

// Firebase rechaza en silencio la escritura si el nodo no tiene reglas: el error
// se muestra en la propia vista para no perder datos sin avisar.
function rpShowError(message) {
  const el = document.getElementById('rp-error');
  if (!el) return;
  el.textContent = message ?? '';
  el.hidden = !message;
}

function saveReparto() {
  const payload = (repartoRows.length || repartoTabs.length)
    ? { rows: repartoRows, tabs: repartoTabs }
    : null;
  db.ref('reparto').set(payload)
    .then(() => rpShowError(null))
    .catch((error) => {
      const msg = error?.message ?? String(error);
      console.error('[reparto] Error guardando en Firebase:', msg);
      rpShowError(
        /permission/i.test(msg)
          ? 'No se pueden guardar los cambios: el nodo «reparto» no tiene permisos en las reglas de Firebase.'
          : `No se pueden guardar los cambios: ${msg}`
      );
    });
}

// Tareas de Planificadas disponibles como opciones de "Rutina".
function rpRoutineOptions() {
  return Array.from(detailTaskList.querySelectorAll('.detail-task-item')).map(tr => ({
    id: tr.dataset.id,
    title: tr.querySelector('.detail-task-title')?.textContent ?? '(sin título)',
  })).filter(o => o.id);
}

function rpSvg(paths, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

const RP_ICON_CHEVRON  = rpSvg('<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', 14);
const RP_ICON_CHECK    = rpSvg('<path d="M13.5 4.5L6.5 11.5L3 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>', 14);
const RP_ICON_COPY     = rpSvg('<path d="M13 6H7.33A1.33 1.33 0 0 0 6 7.33V13a1.33 1.33 0 0 0 1.33 1.33H13A1.33 1.33 0 0 0 14.33 13V7.33A1.33 1.33 0 0 0 13 6Z" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.33 10h-.66A1.33 1.33 0 0 1 1.33 8.67V3a1.33 1.33 0 0 1 1.34-1.33h5.66A1.33 1.33 0 0 1 9.67 3v.67" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>', 15);
const RP_ICON_DOC      = rpSvg('<path d="M9.33 1.83H4a1.17 1.17 0 0 0-1.17 1.17v10a1.17 1.17 0 0 0 1.17 1.17h8a1.17 1.17 0 0 0 1.17-1.17V5.67L9.33 1.83Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.33 1.83V5.67h3.84" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.67 8.5h4.66M5.67 11h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', 14);

// Quill devuelve '<p><br></p>' cuando el editor está vacío: hay que mirar el texto.
function rpHasInstructions(html) {
  if (!html) return false;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

function rpAvatar(ownerKey) {
  const meta = RP_OWNERS[ownerKey];
  const el = document.createElement('span');
  el.className = 'rp-avatar';
  el.style.setProperty('--rp-avatar-bg', meta.color);
  el.textContent = meta.initial;
  return el;
}

// "Ambos" se representa con las dos iniciales superpuestas.
function rpPerson(ownerKey) {
  const wrap = document.createElement('span');
  wrap.className = 'rp-person';
  if (ownerKey === 'ambos') {
    const stack = document.createElement('span');
    stack.className = 'rp-avatar-stack';
    stack.append(rpAvatar('cristina'), rpAvatar('fernando'));
    wrap.appendChild(stack);
  } else {
    wrap.appendChild(rpAvatar(ownerKey));
  }
  const name = document.createElement('span');
  name.textContent = RP_OWNERS[ownerKey].label;
  wrap.appendChild(name);
  return wrap;
}

function rpOwnerBadge(ownerKey) {
  if (ownerKey !== 'ambos') return rpAvatar(ownerKey);
  const stack = document.createElement('span');
  stack.className = 'rp-avatar-stack';
  stack.append(rpAvatar('cristina'), rpAvatar('fernando'));
  return stack;
}

function rpRoutineChips(ids, byId) {
  const frag = document.createDocumentFragment();
  ids.forEach(id => {
    const chip = document.createElement('span');
    const title = byId.get(id);
    chip.className = 'rp-chip' + (title ? '' : ' rp-chip--muted');
    chip.textContent = title ?? 'Tarea eliminada';
    frag.appendChild(chip);
  });
  return frag;
}

// --- Popover compartido (posición fija: no lo recorta el scroll de la tabla) ---

let rpPopover = null;
let rpPopoverAnchor = null;

function rpClosePopover() {
  if (!rpPopover) return;
  rpPopover.remove();
  rpPopoverAnchor?.setAttribute('aria-expanded', 'false');
  rpPopover = null;
  rpPopoverAnchor = null;
}

function rpPositionPopover(pop, anchor) {
  const r = anchor.getBoundingClientRect();
  const gap = 6;
  pop.style.minWidth = `${Math.max(r.width, 220)}px`;
  const h = pop.offsetHeight;
  const w = pop.offsetWidth;
  let top = r.bottom + gap;
  if (top + h > window.innerHeight - 8) {
    top = Math.max(8, r.top - gap - h);
  }
  let left = r.left;
  if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - w);
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;
}

function rpOpenPopover(anchor, build) {
  const reopening = rpPopoverAnchor === anchor;
  rpClosePopover();
  if (reopening) return;

  const pop = document.createElement('div');
  pop.className = 'rp-popover';
  build(pop, () => rpClosePopover());
  document.body.appendChild(pop);

  rpPopover = pop;
  rpPopoverAnchor = anchor;
  anchor.setAttribute('aria-expanded', 'true');
  rpPositionPopover(pop, anchor);
  pop.querySelector('input, .rp-option')?.focus();
}

document.addEventListener('pointerdown', (e) => {
  if (!rpPopover) return;
  if (rpPopover.contains(e.target) || rpPopoverAnchor?.contains(e.target)) return;
  rpClosePopover();
});

// Escape cierra primero el desplegable y, si no hay ninguno, el modal.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (rpPopover) {
    const anchor = rpPopoverAnchor;
    rpClosePopover();
    anchor?.focus();
  } else if (rpViewModal && !rpViewModal.hidden) {
    rpCloseViewModal();
  } else if (rpModal && !rpModal.hidden) {
    rpCloseModal();
  }
});

window.addEventListener('resize', rpClosePopover);
window.addEventListener('scroll', rpClosePopover, true);

function rpOption({ label, selected, multi, onClick, prefix }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rp-option';
  btn.setAttribute(multi ? 'aria-checked' : 'aria-selected', String(selected));
  if (multi) btn.setAttribute('role', 'menuitemcheckbox');

  if (multi) {
    const box = document.createElement('span');
    box.className = 'rp-checkbox';
    box.innerHTML = RP_ICON_CHECK;
    btn.appendChild(box);
  }
  if (prefix) btn.appendChild(prefix);

  const text = document.createElement('span');
  text.className = 'rp-option-label';
  text.textContent = label;
  btn.appendChild(text);

  if (!multi) {
    const check = document.createElement('span');
    check.className = 'rp-option-check';
    check.innerHTML = RP_ICON_CHECK;
    btn.appendChild(check);
  }

  btn.addEventListener('click', onClick);
  return btn;
}

function rpFieldTrigger() {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'rp-trigger rp-trigger--boxed';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');

  const body = document.createElement('span');
  body.className = 'rp-trigger-body';

  const chevron = document.createElement('span');
  chevron.className = 'rp-trigger-chevron';
  chevron.innerHTML = RP_ICON_CHEVRON;

  trigger.append(body, chevron);
  return trigger;
}

// --- Campos del modal (escriben sobre rpDraft, no sobre la fila real) ---

function rpBuildOwnerField() {
  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');
  const paint = () => { body.innerHTML = ''; body.appendChild(rpPerson(rpDraft.responsable)); };
  paint();

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop, close) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';
      Object.keys(RP_OWNERS).forEach(key => {
        list.appendChild(rpOption({
          label: RP_OWNERS[key].label,
          selected: rpDraft.responsable === key,
          multi: false,
          prefix: rpOwnerBadge(key),
          onClick: () => { rpDraft.responsable = key; paint(); close(); },
        }));
      });
      pop.appendChild(list);
    });
  });

  rpModalOwner.innerHTML = '';
  rpModalOwner.appendChild(trigger);
}

// Selector de pestaña. Solo mueve la fila entre pestañas existentes: crearlas
// es cosa de la barra superior.
function rpBuildTabField() {
  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');
  const label = document.createElement('span');
  label.textContent = rpDraft.pestana || 'Sin pestaña';
  body.appendChild(label);

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop, close) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';
      repartoTabs.forEach(name => {
        list.appendChild(rpOption({
          label: name,
          selected: rpDraft.pestana === name,
          multi: false,
          onClick: () => {
            rpDraft.pestana = name;
            label.textContent = name;
            close();
            rpBuildSectionField(); // las secciones son las de la pestaña destino
          },
        }));
      });
      pop.appendChild(list);
    });
  });

  rpModalTab.innerHTML = '';
  rpModalTab.appendChild(trigger);
}

// Selector de sección: lista las que ya existen y permite crear una nueva
// escribiendo su nombre, sin pantalla aparte de gestión de secciones.
function rpBuildSectionField() {
  const sections = rpSectionNames(rpDraft.pestana);
  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');
  const label = document.createElement('span');
  body.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rp-field-input';
  input.placeholder = 'Nombre de la sección';
  input.maxLength = 60;
  input.setAttribute('aria-label', 'Nombre de la sección nueva');
  // El campo se reconstruye al cambiar de pestaña: hay que conservar el nombre
  // que se estuviera escribiendo.
  input.value = rpSectionCreating ? (rpDraft.seccion || '') : '';
  input.hidden = !rpSectionCreating;
  rpSectionInput = input;

  const paint = () => {
    if (rpSectionCreating) {
      label.textContent = rpDraft.seccion || 'Nueva sección';
      label.classList.toggle('rp-placeholder', !rpDraft.seccion);
    } else {
      label.textContent = rpDraft.seccion || 'Sin sección';
      label.classList.toggle('rp-placeholder', !rpDraft.seccion);
    }
  };
  paint();

  input.addEventListener('input', () => {
    rpDraft.seccion = input.value;
    paint();
    rpSyncSaveState();
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') rpSaveModal(); });

  const choose = (value, creating) => {
    rpSectionCreating = creating;
    rpDraft.seccion = value;
    input.hidden = !creating;
    if (creating) input.value = '';
    paint();
    rpSyncSaveState();
    if (creating) input.focus();
  };

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop, close) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';

      list.appendChild(rpOption({
        label: 'Sin sección',
        selected: !rpSectionCreating && !rpDraft.seccion,
        multi: false,
        onClick: () => { close(); choose('', false); },
      }));

      sections.forEach(name => {
        list.appendChild(rpOption({
          label: name,
          selected: !rpSectionCreating && rpDraft.seccion === name,
          multi: false,
          onClick: () => { close(); choose(name, false); },
        }));
      });

      const create = rpOption({
        label: 'Nueva sección…',
        selected: rpSectionCreating,
        multi: false,
        onClick: () => { close(); choose('', true); },
      });
      create.classList.add('rp-option--action');
      list.appendChild(create);

      pop.appendChild(list);
    });
  });

  rpModalSection.innerHTML = '';
  rpModalSection.append(trigger, input);
}

// Selector: para añadir frecuencias basta con ampliar RP_FREQS.
// 'Personalizado' despliega debajo un campo libre, que es lo que verá la tabla.
function rpBuildFreqField() {
  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');
  const label = document.createElement('span');
  label.textContent = RP_FREQS[rpDraft.frecuencia];
  body.appendChild(label);

  const custom = document.createElement('input');
  custom.type = 'text';
  custom.className = 'rp-field-input';
  custom.placeholder = 'Ej. Cada dos semanas';
  custom.maxLength = 110;
  custom.setAttribute('aria-label', 'Frecuencia personalizada');
  custom.value = rpDraft.frecuenciaPersonalizada;
  custom.hidden = rpDraft.frecuencia !== 'personalizado';
  custom.addEventListener('input', () => {
    rpDraft.frecuenciaPersonalizada = custom.value;
    rpSyncSaveState();
  });
  custom.addEventListener('keydown', (e) => { if (e.key === 'Enter') rpSaveModal(); });
  rpFreqCustomInput = custom;

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop, close) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';
      Object.entries(RP_FREQS).forEach(([key, text]) => {
        list.appendChild(rpOption({
          label: text,
          selected: rpDraft.frecuencia === key,
          multi: false,
          onClick: () => {
            rpDraft.frecuencia = key;
            label.textContent = text;
            const isCustom = key === 'personalizado';
            custom.hidden = !isCustom;
            close();
            rpSyncSaveState();
            if (isCustom) custom.focus();
          },
        }));
      });
      pop.appendChild(list);
    });
  });

  rpModalFreq.innerHTML = '';
  rpModalFreq.append(trigger, custom);
}

function rpBuildRoutineField() {
  const options = rpRoutineOptions();
  const byId = new Map(options.map(o => [o.id, o.title]));

  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');

  const paint = () => {
    body.innerHTML = '';
    if (!rpDraft.rutina.length) {
      const ph = document.createElement('span');
      ph.className = 'rp-placeholder';
      ph.textContent = 'Sin rutina';
      body.appendChild(ph);
    } else {
      body.appendChild(rpRoutineChips(rpDraft.rutina, byId));
    }
  };
  paint();

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';

      const fill = (filter = '') => {
        list.innerHTML = '';
        const term = filter.trim().toLowerCase();
        const shown = options.filter(o => !term || o.title.toLowerCase().includes(term));
        if (!shown.length) {
          const msg = document.createElement('p');
          msg.className = 'rp-popover-empty';
          msg.textContent = options.length ? 'Ninguna tarea coincide' : 'No hay tareas en Planificadas';
          list.appendChild(msg);
          return;
        }
        shown.forEach(o => {
          list.appendChild(rpOption({
            label: o.title,
            selected: rpDraft.rutina.includes(o.id),
            multi: true,
            onClick: (e) => {
              const i = rpDraft.rutina.indexOf(o.id);
              if (i === -1) rpDraft.rutina.push(o.id); else rpDraft.rutina.splice(i, 1);
              e.currentTarget.setAttribute('aria-checked', String(i === -1));
              paint();
            },
          }));
        });
      };

      // Buscador solo cuando la lista es larga.
      if (options.length > 6) {
        const search = document.createElement('input');
        search.type = 'text';
        search.className = 'rp-popover-search';
        search.placeholder = 'Buscar tarea…';
        search.addEventListener('input', () => fill(search.value));
        pop.appendChild(search);
      }

      fill();
      pop.appendChild(list);
    });
  });

  rpModalRoutine.innerHTML = '';
  rpModalRoutine.appendChild(trigger);
}

// --- Modal ---

// Con 'Personalizado' la etiqueta libre es obligatoria: si no, la celda de la
// tabla quedaría sin nada que mostrar.
function rpSyncSaveState() {
  const needsCustom = rpDraft?.frecuencia === 'personalizado';
  const customFilled = !needsCustom || !!rpFreqCustomInput?.value.trim();
  // Una sección nueva sin nombre no se puede guardar.
  const sectionFilled = !rpSectionCreating || !!rpSectionInput?.value.trim();
  rpModalSave.disabled = !rpModalTask.value.trim() || !customFilled || !sectionFilled;
}

function rpOpenModal(row = null) {
  rpEditingId = row?.id ?? null;
  rpDraft = row
    ? { ...row, rutina: [...row.rutina] }
    : { id: rpNewId(), tarea: '', pestana: rpActiveTab, seccion: '', responsable: 'cristina', frecuencia: 'diario', frecuenciaPersonalizada: '', rutina: [], instrucciones: '' };

  rpLastFocus = document.activeElement;
  rpSectionCreating = false;
  rpModalTitle.textContent = row ? 'Editar fila' : 'Nueva fila';
  rpModalTask.value = rpDraft.tarea;
  rpModalDelete.hidden = !row;
  rpBuildTabField();
  rpBuildSectionField();
  rpBuildOwnerField();
  rpBuildFreqField();
  rpBuildRoutineField();
  rpInstrQuill.clipboard.dangerouslyPasteHTML(rpDraft.instrucciones || '');
  rpSyncSaveState();

  rpModal.hidden = false;
  document.body.classList.add('rp-modal-open');
  rpModalTask.focus();
  rpModalTask.select();
}

function rpCloseModal() {
  rpClosePopover();
  rpModal.hidden = true;
  document.body.classList.remove('rp-modal-open');
  rpDraft = null;
  rpEditingId = null;
  rpFreqCustomInput = null;
  rpSectionInput = null;
  rpSectionCreating = false;
  if (rpLastFocus?.isConnected) rpLastFocus.focus();
  rpLastFocus = null;
}

function rpSaveModal() {
  if (!rpDraft) return;
  rpDraft.tarea = rpModalTask.value.trim();
  if (!rpDraft.tarea) { rpModalTask.focus(); return; }

  if (rpDraft.frecuencia === 'personalizado') {
    rpDraft.frecuenciaPersonalizada = (rpFreqCustomInput?.value ?? '').trim();
    if (!rpDraft.frecuenciaPersonalizada) { rpFreqCustomInput?.focus(); return; }
  } else {
    rpDraft.frecuenciaPersonalizada = ''; // no se arrastra el texto de una frecuencia anterior
  }

  rpDraft.seccion = (rpDraft.seccion ?? '').trim();
  if (rpSectionCreating && !rpDraft.seccion) { rpSectionInput?.focus(); return; }

  const html = rpInstrQuill.root.innerHTML;
  rpDraft.instrucciones = rpHasInstructions(html) ? html : '';

  const i = repartoRows.findIndex(r => r.id === rpEditingId);
  if (i === -1) repartoRows.push(rpDraft);
  else repartoRows[i] = rpDraft;

  // Si la fila se ha movido de pestaña, seguimos a la fila: si no, parecería
  // que ha desaparecido.
  if (rpDraft.pestana && rpDraft.pestana !== rpActiveTab) {
    rpActiveTab = rpDraft.pestana;
    localStorage.setItem('rp-active-tab', rpActiveTab);
  }

  rpCloseModal();
  renderReparto();
  saveReparto();
}

function rpDeleteFromModal() {
  repartoRows = repartoRows.filter(r => r.id !== rpEditingId);
  rpCloseModal();
  renderReparto();
  saveReparto();
}

// --- Modal de lectura de instrucciones ---

let rpViewLastFocus = null;

function rpOpenViewModal(row, opener) {
  rpViewLastFocus = opener ?? document.activeElement;
  rpViewTitle.textContent = row.tarea || 'Sin título';
  rpReaderQuill.clipboard.dangerouslyPasteHTML(row.instrucciones || '');
  rpViewModal.hidden = false;
  document.body.classList.add('rp-modal-open');
  document.getElementById('rp-view-close')?.focus();
}

function rpCloseViewModal() {
  rpViewModal.hidden = true;
  document.body.classList.remove('rp-modal-open');
  if (rpViewLastFocus?.isConnected) rpViewLastFocus.focus();
  rpViewLastFocus = null;
}

document.getElementById('rp-view-close')?.addEventListener('click', rpCloseViewModal);
document.getElementById('rp-view-backdrop')?.addEventListener('click', rpCloseViewModal);

rpModalTask?.addEventListener('input', rpSyncSaveState);
rpModalTask?.addEventListener('keydown', (e) => { if (e.key === 'Enter') rpSaveModal(); });
rpModalSave?.addEventListener('click', rpSaveModal);
rpModalDelete?.addEventListener('click', rpDeleteFromModal);
document.getElementById('rp-modal-cancel')?.addEventListener('click', rpCloseModal);
document.getElementById('rp-modal-close')?.addEventListener('click', rpCloseModal);
document.getElementById('rp-modal-backdrop')?.addEventListener('click', rpCloseModal);

// --- Tabla (solo lectura) ---

function rpBuildRow(row, byId) {
  const tr = document.createElement('tr');
  tr.dataset.id = row.id;
  tr.tabIndex = 0;
  tr.setAttribute('role', 'button');
  tr.setAttribute('aria-label', `Editar ${row.tarea || 'fila sin título'}`);

  const tdGrip = document.createElement('td');
  tdGrip.className = 'rp-cell-grip';
  const grip = document.createElement('span');
  grip.className = 'rp-row-grip';
  grip.textContent = '⠿';
  grip.title = 'Arrastra para reordenar';
  grip.setAttribute('draggable', 'true');
  grip.addEventListener('click', (e) => e.stopPropagation()); // no debe abrir el modal
  grip.addEventListener('dragstart', (e) => {
    rpDragRow = tr;
    rpDragRowDropped = false;
    tr.classList.add('rp-row--dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.id);
    }
  });
  grip.addEventListener('dragend', () => {
    tr.classList.remove('rp-row--dragging');
    if (!rpDragRowDropped) renderReparto(); // cancelado: restaura el orden guardado
    rpDragRow = null;
  });
  tdGrip.appendChild(grip);

  const tdTask = document.createElement('td');
  const title = document.createElement('span');
  title.className = 'rp-cell-task' + (row.tarea ? '' : ' rp-placeholder');
  title.textContent = row.tarea || 'Sin título';
  tdTask.appendChild(title);

  const tdOwner = document.createElement('td');
  tdOwner.appendChild(rpPerson(row.responsable));

  const tdFreq = document.createElement('td');
  const freq = document.createElement('span');
  freq.className = 'rp-cell-freq';
  freq.textContent = rpFreqLabel(row);
  tdFreq.appendChild(freq);

  const tdRoutine = document.createElement('td');
  if (!row.rutina.length) {
    const dash = document.createElement('span');
    dash.className = 'rp-placeholder';
    dash.textContent = '—';
    tdRoutine.appendChild(dash);
  } else {
    const chips = document.createElement('span');
    chips.className = 'rp-chips';
    chips.appendChild(rpRoutineChips(row.rutina, byId));
    tdRoutine.appendChild(chips);
  }

  // El botón solo existe si hay instrucciones; si no, la celda queda vacía.
  const tdInstr = document.createElement('td');
  if (rpHasInstructions(row.instrucciones)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rp-instr-btn';
    btn.setAttribute('aria-label', `Ver instrucciones de ${row.tarea || 'la fila'}`);
    btn.innerHTML = RP_ICON_DOC;
    const btnText = document.createElement('span');
    btnText.textContent = 'Ver';
    btn.appendChild(btnText);
    // Sin esto, el clic burbujearía a la fila y abriría también el modal de edición.
    btn.addEventListener('click', (e) => { e.stopPropagation(); rpOpenViewModal(row, btn); });
    tdInstr.appendChild(btn);
  }

  const tdDuplicate = document.createElement('td');
  const dupBtn = document.createElement('button');
  dupBtn.type = 'button';
  dupBtn.className = 'rp-row-duplicate';
  dupBtn.title = 'Duplicar fila';
  dupBtn.setAttribute('aria-label', `Duplicar ${row.tarea || 'la fila'}`);
  dupBtn.innerHTML = RP_ICON_COPY;
  dupBtn.addEventListener('click', (e) => { e.stopPropagation(); rpDuplicateRow(row); });
  tdDuplicate.appendChild(dupBtn);

  tr.append(tdGrip, tdTask, tdInstr, tdOwner, tdFreq, tdRoutine, tdDuplicate);
  tr.addEventListener('click', () => rpOpenModal(row));
  tr.addEventListener('keydown', (e) => {
    if (e.target !== tr) return; // el Enter sobre el botón de instrucciones es suyo
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rpOpenModal(row); }
  });
  return tr;
}

// Las secciones se derivan de las propias filas: no hay lista aparte que
// mantener sincronizada. Una sección existe mientras tenga alguna fila, y el
// orden de las secciones es el de aparición de sus filas en repartoRows.
function rpGroupRows(tab = rpActiveTab) {
  const groups = new Map();
  rpTabRows(tab).forEach(row => {
    const key = row.seccion || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.entries()].map(([key, rows]) => ({ key, rows }));
}

// Las secciones que ofrece el modal son las de la pestaña de esa fila.
function rpSectionNames(tab = rpActiveTab) {
  return rpGroupRows(tab).map(g => g.key).filter(Boolean);
}

// Renombrar = reetiquetar todas las filas del grupo. Con nombre vacío las saca
// de la sección; con el nombre de otra sección existente, ambas se fusionan.
function rpRenameSection(oldKey, newName) {
  const name = newName.trim();
  if (name === oldKey) return;
  rpTabRows().forEach(row => {
    if ((row.seccion || '') === oldKey) row.seccion = name;
  });
  renderReparto();
  saveReparto();
}

// Reordenar = mover el bloque de filas de esa sección dentro del array. De paso
// deja las filas agrupadas de forma contigua, que es como se leen luego.
function rpApplySectionOrder(keys) {
  const pending = new Map(rpGroupRows().map(g => [g.key, g.rows]));
  const ordered = [];
  keys.forEach(key => {
    if (!pending.has(key)) return;
    ordered.push(...pending.get(key));
    pending.delete(key);
  });
  pending.forEach(rows => ordered.push(...rows)); // por si alguna no venía en la lista
  rpReplaceActiveTabRows(ordered);
  renderReparto();
  saveReparto();
}

// Sustituye las filas de la pestaña activa conservando las del resto: el orden
// entre pestañas es irrelevante, pero sus filas no deben perderse ni moverse.
function rpReplaceActiveTabRows(rows) {
  const others = repartoRows.filter(row => row.pestana !== rpActiveTab);
  repartoRows = [...rows, ...others];
}

function rpMoveSection(key, direction) {
  const keys = rpGroupRows().map(g => g.key);
  const i = keys.indexOf(key);
  const j = i + direction;
  if (i === -1 || j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]];
  rpApplySectionOrder(keys);
}

// --- Arrastrar para reordenar (secciones y filas) ---
// Mismo enfoque que el drag & drop de Planificadas (HTML5 DnD). En táctil no
// hay arrastre nativo: para secciones quedan Subir/Bajar del menú.
let rpDragGroup = null;
let rpDragDropped = false;
let rpDragRow = null;
let rpDragRowDropped = false;

// Reconstruye el modelo leyendo el DOM: primero el orden de las secciones y,
// dentro de cada una, el de sus filas.
function rpApplyDomOrder() {
  const pending = new Map(rpTabRows().map(r => [r.id, r]));
  const ordered = [];
  rpGroups.querySelectorAll('.rp-group').forEach(groupEl => {
    groupEl.querySelectorAll('tbody tr').forEach(tr => {
      const row = pending.get(tr.dataset.id);
      if (!row) return;
      ordered.push(row);
      pending.delete(tr.dataset.id);
    });
  });
  pending.forEach(row => ordered.push(row)); // salvaguarda: nada se pierde
  rpReplaceActiveTabRows(ordered);
  renderReparto();
  saveReparto();
}

rpGroups?.addEventListener('dragover', (e) => {
  if (!rpDragGroup && !rpDragRow) return;
  e.preventDefault(); // imprescindible para que se dispare el 'drop' al soltar

  if (rpDragRow) {
    const overRow = e.target.closest?.('tr');
    if (!overRow || overRow === rpDragRow) return;
    const tbody = rpDragRow.parentElement;
    if (overRow.parentElement !== tbody) return; // solo dentro de la misma tabla
    const rect = overRow.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    tbody.insertBefore(rpDragRow, before ? overRow : overRow.nextSibling);
    return;
  }

  const over = e.target.closest?.('.rp-group');
  if (!over || over === rpDragGroup) return;
  const rect = over.getBoundingClientRect();
  const before = (e.clientY - rect.top) < rect.height / 2;
  rpGroups.insertBefore(rpDragGroup, before ? over : over.nextSibling);
});

rpGroups?.addEventListener('drop', (e) => {
  if (!rpDragGroup && !rpDragRow) return;
  e.preventDefault();
  if (rpDragRow) rpDragRowDropped = true; else rpDragDropped = true;
  rpApplyDomOrder();
});

// Renombrado en línea: el título se sustituye por un campo hasta confirmar.
function rpStartRename(titleEl, key) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rp-group-rename';
  input.maxLength = 60;
  input.placeholder = 'Nombre de la sección';
  input.value = key;

  let settled = false;
  const cancel = () => { if (settled) return; settled = true; renderReparto(); };
  const commit = () => {
    if (settled) return;
    settled = true;
    const name = input.value.trim();
    if (name === key) renderReparto(); else rpRenameSection(key, name);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.stopPropagation(); cancel(); } // no debe cerrar el modal
  });
  input.addEventListener('blur', commit);

  // Sin esto, arrastrar para seleccionar texto dentro del campo iniciaría el
  // arrastre de la sección.
  titleEl.draggable = false;
  titleEl.replaceChildren(input);
  input.focus();
  input.select();
}

function rpOpenSectionMenu(btn, key, index, total) {
  rpOpenPopover(btn, (pop, close) => {
    const list = document.createElement('div');
    list.className = 'rp-popover-list';

    const add = (label, disabled, onClick) => {
      const opt = rpOption({ label, selected: false, multi: false, onClick: () => { close(); onClick(); } });
      if (disabled) {
        opt.disabled = true;
        opt.classList.add('rp-option--disabled');
      }
      list.appendChild(opt);
    };

    add('Renombrar sección', false, () => {
      const title = btn.closest('.rp-group-title');
      if (title) rpStartRename(title, key);
    });
    add('Subir', index === 0, () => rpMoveSection(key, -1));
    add('Bajar', index === total - 1, () => rpMoveSection(key, 1));

    pop.appendChild(list);
  });
}

// La copia se inserta justo debajo del original y conserva su sección.
function rpDuplicateRow(row) {
  const copy = { ...row, id: rpNewId(), rutina: [...row.rutina] };
  const i = repartoRows.findIndex(r => r.id === row.id);
  repartoRows.splice(i === -1 ? repartoRows.length : i + 1, 0, copy);
  renderReparto();
  saveReparto();
}

// --- Pestañas ---

function rpCreateTab(name) {
  const clean = name.trim();
  if (!clean || clean === RP_SUMMARY_TAB) return;
  if (!repartoTabs.includes(clean)) repartoTabs.push(clean);
  rpActiveTab = clean;
  localStorage.setItem('rp-active-tab', clean);
  renderReparto();
  saveReparto();
}

// Renombrar arrastra consigo las filas. Si el nombre ya existe, las dos
// pestañas se fusionan, igual que ocurre con las secciones.
function rpRenameTab(oldName, newName) {
  const clean = newName.trim();
  if (!clean || clean === oldName || clean === RP_SUMMARY_TAB) { renderReparto(); return; }

  repartoRows.forEach(row => { if (row.pestana === oldName) row.pestana = clean; });
  const i = repartoTabs.indexOf(oldName);
  if (repartoTabs.includes(clean)) repartoTabs.splice(i, 1);
  else repartoTabs[i] = clean;

  rpActiveTab = clean;
  localStorage.setItem('rp-active-tab', clean);
  renderReparto();
  saveReparto();
}

// --- Arrastrar pestañas ---
let rpDragTab = null;
let rpDragTabDropped = false;

function rpApplyTabDomOrder() {
  const order = [...rpTabsBar.querySelectorAll('.rp-tab[data-tab]')].map(el => el.dataset.tab);
  const seen = new Set(order);
  repartoTabs = [...order.filter(t => repartoTabs.includes(t)), ...repartoTabs.filter(t => !seen.has(t))];
  renderReparto();
  saveReparto();
}

rpTabsBar?.addEventListener('dragover', (e) => {
  if (!rpDragTab) return;
  e.preventDefault(); // imprescindible para que se dispare el 'drop' al soltar
  const over = e.target.closest?.('.rp-tab[data-tab]');
  if (!over || over === rpDragTab) return;
  const rect = over.getBoundingClientRect();
  const before = (e.clientX - rect.left) < rect.width / 2; // barra horizontal
  rpTabsBar.insertBefore(rpDragTab, before ? over : over.nextSibling);
});

rpTabsBar?.addEventListener('drop', (e) => {
  if (!rpDragTab) return;
  e.preventDefault();
  rpDragTabDropped = true;
  rpApplyTabDomOrder();
});

function rpMoveTab(name, direction) {
  const i = repartoTabs.indexOf(name);
  const j = i + direction;
  if (i === -1 || j < 0 || j >= repartoTabs.length) return;
  [repartoTabs[i], repartoTabs[j]] = [repartoTabs[j], repartoTabs[i]];
  renderReparto();
  saveReparto();
}

// Solo se permite borrar una pestaña vacía: así una creada por error se puede
// deshacer, pero nunca se llevan filas por delante.
function rpDeleteTab(name) {
  if (rpTabRows(name).length) return;
  if (repartoTabs.length === 1) return;
  repartoTabs = repartoTabs.filter(t => t !== name);
  if (rpActiveTab === name) rpActiveTab = repartoTabs[0];
  localStorage.setItem('rp-active-tab', rpActiveTab);
  renderReparto();
  saveReparto();
}

// 'General' está reservado para la pestaña fija.
function rpFlagReservedName(input) {
  input.classList.add('rp-tab-rename--invalid');
  input.title = '«General» es la pestaña fija de resumen';
  input.focus();
  input.select();
  setTimeout(() => input.classList.remove('rp-tab-rename--invalid'), 1200);
}

function rpStartTabRename(tabEl, name) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rp-tab-rename';
  input.maxLength = 40;
  input.value = name;

  let settled = false;
  const finish = (commit) => {
    if (settled) return;
    settled = true;
    if (commit) rpRenameTab(name, input.value); else renderReparto();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.value.trim() === RP_SUMMARY_TAB) { rpFlagReservedName(input); return; }
      finish(true);
    }
    if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));

  tabEl.draggable = false; // si no, arrastrar para seleccionar texto movería la pestaña
  tabEl.replaceChildren(input);
  input.focus();
  input.select();
}

function rpOpenTabMenu(btn, name, index) {
  rpOpenPopover(btn, (pop, close) => {
    const list = document.createElement('div');
    list.className = 'rp-popover-list';

    const add = (label, disabled, onClick) => {
      const opt = rpOption({ label, selected: false, multi: false, onClick: () => { close(); onClick(); } });
      if (disabled) { opt.disabled = true; opt.classList.add('rp-option--disabled'); }
      list.appendChild(opt);
    };

    add('Renombrar pestaña', false, () => {
      const tabEl = btn.closest('.rp-tab');
      if (tabEl) rpStartTabRename(tabEl, name);
    });
    add('Mover a la izquierda', index === 0, () => rpMoveTab(name, -1));
    add('Mover a la derecha', index === repartoTabs.length - 1, () => rpMoveTab(name, 1));
    add('Eliminar pestaña', rpTabRows(name).length > 0 || repartoTabs.length === 1, () => rpDeleteTab(name));

    pop.appendChild(list);
  });
}

function rpStartTabCreate() {
  const holder = document.createElement('div');
  holder.className = 'rp-tab rp-tab--new';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rp-tab-rename';
  input.maxLength = 40;
  input.placeholder = 'Nombre de la pestaña';

  let settled = false;
  const finish = (commit) => {
    if (settled) return;
    settled = true;
    if (commit && input.value.trim()) rpCreateTab(input.value); else renderReparto();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.value.trim() === RP_SUMMARY_TAB) { rpFlagReservedName(input); return; }
      finish(true);
    }
    if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));

  holder.appendChild(input);
  rpTabsBar.insertBefore(holder, rpTabsBar.querySelector('.rp-tab-add'));
  input.focus();
}

function renderRepartoTabs() {
  if (!rpTabsBar) return;
  rpTabsBar.innerHTML = '';

  // Pestaña fija de resumen: ni menú, ni arrastre, ni contador de filas.
  const fixed = document.createElement('div');
  fixed.className = 'rp-tab rp-tab--fixed' + (rpActiveTab === RP_SUMMARY_TAB ? ' rp-tab--active' : '');
  const fixedBtn = document.createElement('button');
  fixedBtn.type = 'button';
  fixedBtn.className = 'rp-tab-btn';
  fixedBtn.setAttribute('role', 'tab');
  fixedBtn.setAttribute('aria-selected', String(rpActiveTab === RP_SUMMARY_TAB));
  fixedBtn.textContent = RP_SUMMARY_TAB;
  fixedBtn.addEventListener('click', () => rpSetActiveTab(RP_SUMMARY_TAB));
  fixed.appendChild(fixedBtn);
  rpTabsBar.appendChild(fixed);

  repartoTabs.forEach((name, index) => {
    const tab = document.createElement('div');
    tab.className = 'rp-tab' + (name === rpActiveTab ? ' rp-tab--active' : '');
    tab.dataset.tab = name;
    tab.draggable = true;
    tab.addEventListener('dragstart', (e) => {
      rpDragTab = tab;
      rpDragTabDropped = false;
      tab.classList.add('rp-tab--dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', name);
      }
    });
    tab.addEventListener('dragend', () => {
      tab.classList.remove('rp-tab--dragging');
      if (!rpDragTabDropped) renderReparto(); // cancelado: restaura el orden guardado
      rpDragTab = null;
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rp-tab-btn';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(name === rpActiveTab));
    btn.textContent = name;

    const count = document.createElement('span');
    count.className = 'rp-tab-count';
    count.textContent = rpTabRows(name).length;
    btn.appendChild(count);

    btn.addEventListener('click', () => rpSetActiveTab(name));
    btn.addEventListener('dblclick', () => rpStartTabRename(tab, name));
    tab.appendChild(btn);

    // El menú solo en la pestaña activa, para no llenar la barra de iconos.
    if (name === rpActiveTab) {
      const menuBtn = document.createElement('button');
      menuBtn.type = 'button';
      menuBtn.className = 'rp-tab-menu';
      menuBtn.setAttribute('aria-label', `Opciones de ${name}`);
      menuBtn.setAttribute('aria-haspopup', 'menu');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.innerHTML = RP_ICON_CHEVRON;
      menuBtn.addEventListener('click', () => rpOpenTabMenu(menuBtn, name, index));
      tab.appendChild(menuBtn);
    }

    rpTabsBar.appendChild(tab);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'rp-tab-add';
  addBtn.setAttribute('aria-label', 'Nueva pestaña');
  addBtn.title = 'Nueva pestaña';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', rpStartTabCreate);
  rpTabsBar.appendChild(addBtn);
}

// --- Pestaña fija: resumen del reparto ---

// Las filas de "Ambos" cuentan como media tarea para cada uno: así el donut
// sigue teniendo dos porciones que suman 100 %.
function rpSummaryStats() {
  let cristina = 0, fernando = 0, ambos = 0;
  repartoRows.forEach(row => {
    if (row.responsable === 'fernando') fernando++;
    else if (row.responsable === 'ambos') ambos++;
    else cristina++;
  });
  const total = repartoRows.length;
  const cWeight = cristina + ambos / 2;
  const fWeight = fernando + ambos / 2;
  return {
    total, ambos,
    cristina: { own: cristina, weight: cWeight, pct: total ? (cWeight / total) * 100 : 0 },
    fernando: { own: fernando, weight: fWeight, pct: total ? (fWeight / total) * 100 : 0 },
  };
}

function rpDonut(stats) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const cLen = (stats.cristina.pct / 100) * c;
  const fLen = (stats.fernando.pct / 100) * c;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 160 160');
  svg.setAttribute('class', 'rp-donut');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label',
    `Cristina ${Math.round(stats.cristina.pct)} %, Fernando ${Math.round(stats.fernando.pct)} %`);
  svg.innerHTML = `
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="#eeeef2" stroke-width="20"></circle>
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="${RP_OWNERS.cristina.color}" stroke-width="20"
            stroke-dasharray="${cLen} ${c}" stroke-dashoffset="0"
            transform="rotate(-90 80 80)" stroke-linecap="butt"></circle>
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="${RP_OWNERS.fernando.color}" stroke-width="20"
            stroke-dasharray="${fLen} ${c}" stroke-dashoffset="${-cLen}"
            transform="rotate(-90 80 80)" stroke-linecap="butt"></circle>
    <text x="80" y="75" text-anchor="middle" class="rp-donut-total">${stats.total}</text>
    <text x="80" y="93" text-anchor="middle" class="rp-donut-label">${stats.total === 1 ? 'tarea' : 'tareas'}</text>
  `;
  return svg;
}

function rpSummaryLegendRow(key, data) {
  const meta = RP_OWNERS[key];
  const item = document.createElement('div');
  item.className = 'rp-legend-item';

  const dot = document.createElement('span');
  dot.className = 'rp-legend-dot';
  dot.style.background = meta.color;

  const text = document.createElement('div');
  const name = document.createElement('p');
  name.className = 'rp-legend-name';
  name.textContent = meta.label;
  const detail = document.createElement('p');
  detail.className = 'rp-legend-detail';
  detail.textContent = `${data.own} en solitario`;
  text.append(name, detail);

  const pct = document.createElement('span');
  pct.className = 'rp-legend-pct';
  pct.textContent = `${Math.round(data.pct)} %`;

  item.append(dot, text, pct);
  return item;
}

function renderRepartoSummary() {
  if (!rpSummary) return;
  rpSummary.innerHTML = '';
  const stats = rpSummaryStats();

  if (!stats.total) {
    const empty = document.createElement('div');
    empty.className = 'rp-card rp-empty';
    empty.innerHTML = `
      <p class="rp-empty-title">Todavía no hay nada que repartir</p>
      <p class="rp-empty-text">Cuando añadas tareas en las otras pestañas, aquí verás cómo se reparten.</p>`;
    rpSummary.appendChild(empty);
    return;
  }

  const card = document.createElement('div');
  card.className = 'rp-card rp-summary-card';

  const head = document.createElement('div');
  head.className = 'rp-summary-head';
  head.innerHTML = `
    <h2>Reparto de tareas</h2>
    <p>Todas las pestañas, ${stats.total} ${stats.total === 1 ? 'tarea' : 'tareas'} en total.</p>`;

  const body = document.createElement('div');
  body.className = 'rp-summary-body';
  body.appendChild(rpDonut(stats));

  const legend = document.createElement('div');
  legend.className = 'rp-legend';
  legend.append(
    rpSummaryLegendRow('cristina', stats.cristina),
    rpSummaryLegendRow('fernando', stats.fernando),
  );

  if (stats.ambos) {
    const note = document.createElement('p');
    note.className = 'rp-legend-note';
    note.textContent = `${stats.ambos} ${stats.ambos === 1 ? 'tarea asignada' : 'tareas asignadas'} a Ambos, repartidas a medias entre los dos.`;
    legend.appendChild(note);
  }

  body.appendChild(legend);
  card.append(head, body);
  rpSummary.appendChild(card);
}

function renderReparto() {
  if (!rpGroups) return;
  rpEnsureActiveTab();
  renderRepartoTabs();
  const options = rpRoutineOptions();
  const byId = new Map(options.map(o => [o.id, o.title]));

  // La pestaña fija no tiene tablas ni botón de crear.
  const isSummary = rpActiveTab === RP_SUMMARY_TAB;
  rpSummary.hidden = !isSummary;
  rpToolbar.hidden = isSummary;
  rpGroups.hidden = isSummary;
  if (isSummary) {
    rpEmptyCard.hidden = true;
    rpGroups.innerHTML = '';
    renderRepartoSummary();
    rpOptionsKey = JSON.stringify(options);
    const navSpanSummary = document.querySelector('.nav-item[data-view="reparto"] .nav-count');
    if (navSpanSummary) navSpanSummary.textContent = repartoRows.length || '';
    return;
  }

  const groups = rpGroupRows();
  rpGroups.innerHTML = '';

  groups.forEach(({ key, rows }, index) => {
    const node = rpGroupTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.section = key;

    node.querySelector('.rp-group-name').textContent = key || 'Sin sección';
    node.querySelector('.rp-group-count').textContent = rows.length;

    const menuBtn = node.querySelector('.rp-group-menu');
    menuBtn.addEventListener('click', () => rpOpenSectionMenu(menuBtn, key, index, groups.length));

    const title = node.querySelector('.rp-group-title');
    title.addEventListener('dragstart', (e) => {
      rpDragGroup = node;
      rpDragDropped = false;
      node.classList.add('rp-group--dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
      }
    });
    title.addEventListener('dragend', () => {
      node.classList.remove('rp-group--dragging');
      if (!rpDragDropped) renderReparto(); // cancelado: restaura el orden guardado
      rpDragGroup = null;
    });

    const tbody = node.querySelector('tbody');
    rows.forEach(row => tbody.appendChild(rpBuildRow(row, byId)));
    rpGroups.appendChild(node);
  });

  rpEmptyCard.hidden = groups.length > 0; // vacío = esta pestaña, no toda la vista

  rpOptionsKey = JSON.stringify(options);

  const navSpan = document.querySelector('.nav-item[data-view="reparto"] .nav-count');
  if (navSpan) navSpan.textContent = repartoRows.length || '';
}

document.getElementById('rp-add-btn')?.addEventListener('click', () => rpOpenModal());
document.getElementById('rp-empty-add')?.addEventListener('click', () => rpOpenModal());

// Si cambian las tareas de Planificadas, los títulos de la columna Rutina
// pueden quedar obsoletos: se repinta solo cuando la lista de opciones cambia.
function refreshRepartoRoutineOptions() {
  if (!rpGroups || rpOptionsKey === null) return;
  if (JSON.stringify(rpRoutineOptions()) !== rpOptionsKey) renderReparto();
}

function startRepartoListener() {
  renderReparto(); // pinta el estado vacío mientras llega el primer snapshot
  db.ref('reparto').on('value', (snapshot) => {
    const { rows, tabs } = rpParseSnapshot(snapshot.val());
    const before = JSON.stringify({ rows: repartoRows, tabs: repartoTabs });

    repartoRows = rows.map(rpNormalizeRow);
    repartoTabs = tabs;
    // La reconciliación va antes de comparar: con la base vacía el estado
    // entrante coincide con el actual y, si saliéramos aquí, no llegaría a
    // crearse nunca la primera pestaña.
    const migrated = rpReconcileTabs();
    rpEnsureActiveTab();

    // Evita repintar (y perder el foco) cuando el eco de Firebase es lo ya escrito.
    if (JSON.stringify({ rows: repartoRows, tabs: repartoTabs }) === before) return;

    renderReparto();
    if (migrated) saveReparto(); // deja el estado normalizado también en Firebase
  }, (error) => {
    const msg = error?.message ?? String(error);
    console.error('[reparto] Error leyendo reparto en Firebase:', msg);
    rpShowError(
      /permission/i.test(msg)
        ? 'No se pueden leer los datos: el nodo «reparto» no tiene permisos en las reglas de Firebase.'
        : `No se pueden leer los datos: ${msg}`
    );
  });
}


// --- Convivencia -----------------------------------------------------------
// Misma UI que Reparto (reutiliza sus estilos rp-, el popover y los
// disparadores): tabla de solo lectura y modal que edita un borrador.

// El orden de las claves es el orden de las tablas en la vista.
const CV_STATUSES = {
  'en-proceso':  { label: 'En curso',    color: '#d97706' },
  'sin-empezar': { label: 'Sin empezar', color: '#9a9aa5' },
  'resuelto':    { label: 'Resuelto',    color: '#16a34a' },
};

// Estancia opcional: '' = sin asignar.
const CV_ROOMS = {
  'solana':           'Solana',
  'cocina':           'Cocina',
  'bano-dentro':      'Baño dentro',
  'dormitorio':       'Dormitorio',
  'dormitorio-sofia': 'Dormitorio Sofía',
};

const cvGroups     = document.getElementById('cv-groups');
const cvGroupTemplate = document.getElementById('cv-group-template');
const cvEmptyCard  = document.getElementById('cv-empty-card');
const cvModal      = document.getElementById('cv-modal');
const cvModalTitle = document.getElementById('cv-modal-title');
const cvModalInput = document.getElementById('cv-modal-title-input');
const cvModalStatus = document.getElementById('cv-modal-status');
const cvModalRoom  = document.getElementById('cv-modal-room');
const cvModalSave  = document.getElementById('cv-modal-save');
const cvModalDelete = document.getElementById('cv-modal-delete');

let convivenciaRows = [];
let cvDraft     = null;   // copia editable de la fila abierta en el modal
let cvEditingId = null;   // null = fila nueva
let cvLastFocus = null;

function cvNormalizeRow(row, i) {
  const r = row ?? {};
  return {
    id: r.id ?? `cv-legacy-${i}`,
    titulo: typeof r.titulo === 'string' ? r.titulo : '',
    estancia: CV_ROOMS[r.estancia] ? r.estancia : '',
    estado: CV_STATUSES[r.estado] ? r.estado : 'sin-empezar',
  };
}

function cvRoomLabel(key) {
  const el = document.createElement('span');
  el.className = key ? '' : 'rp-placeholder';
  el.textContent = CV_ROOMS[key] ?? 'Sin asignar';
  return el;
}

function cvStatusBadge(key) {
  const meta = CV_STATUSES[key];
  const el = document.createElement('span');
  el.className = 'cv-status';
  el.style.setProperty('--cv-status-color', meta.color);
  const dot = document.createElement('span');
  dot.className = 'cv-status-dot';
  const text = document.createElement('span');
  text.textContent = meta.label;
  el.append(dot, text);
  return el;
}

function cvShowError(message) {
  const el = document.getElementById('cv-error');
  if (!el) return;
  el.textContent = message ?? '';
  el.hidden = !message;
}

function saveConvivencia() {
  db.ref('convivencia').set(convivenciaRows.length ? convivenciaRows : null)
    .then(() => cvShowError(null))
    .catch((error) => {
      const msg = error?.message ?? String(error);
      console.error('[convivencia] Error guardando en Firebase:', msg);
      cvShowError(
        /permission/i.test(msg)
          ? 'No se pueden guardar los cambios: el nodo «convivencia» no tiene permisos en las reglas de Firebase.'
          : `No se pueden guardar los cambios: ${msg}`
      );
    });
}

function cvBuildStatusField() {
  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');
  const paint = () => { body.innerHTML = ''; body.appendChild(cvStatusBadge(cvDraft.estado)); };
  paint();

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop, close) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';
      Object.keys(CV_STATUSES).forEach(key => {
        const dot = document.createElement('span');
        dot.className = 'cv-status-dot';
        dot.style.setProperty('--cv-status-color', CV_STATUSES[key].color);
        list.appendChild(rpOption({
          label: CV_STATUSES[key].label,
          selected: cvDraft.estado === key,
          multi: false,
          prefix: dot,
          onClick: () => { cvDraft.estado = key; paint(); close(); },
        }));
      });
      pop.appendChild(list);
    });
  });

  cvModalStatus.innerHTML = '';
  cvModalStatus.appendChild(trigger);
}

function cvBuildRoomField() {
  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');
  const paint = () => { body.innerHTML = ''; body.appendChild(cvRoomLabel(cvDraft.estancia)); };
  paint();

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop, close) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';
      ['', ...Object.keys(CV_ROOMS)].forEach(key => {
        list.appendChild(rpOption({
          label: CV_ROOMS[key] ?? 'Sin asignar',
          selected: cvDraft.estancia === key,
          multi: false,
          onClick: () => { cvDraft.estancia = key; paint(); close(); },
        }));
      });
      pop.appendChild(list);
    });
  });

  cvModalRoom.innerHTML = '';
  cvModalRoom.appendChild(trigger);
}

function cvSyncSaveState() {
  cvModalSave.disabled = !cvModalInput.value.trim();
}

function cvOpenModal(row = null) {
  cvEditingId = row?.id ?? null;
  cvDraft = row
    ? { ...row }
    : { id: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, titulo: '', estancia: '', estado: 'sin-empezar' };

  cvLastFocus = document.activeElement;
  cvModalTitle.textContent = row ? 'Editar fila' : 'Nueva fila';
  cvModalInput.value = cvDraft.titulo;
  cvModalDelete.hidden = !row;
  cvBuildRoomField();
  cvBuildStatusField();
  cvSyncSaveState();

  cvModal.hidden = false;
  document.body.classList.add('rp-modal-open');
  cvModalInput.focus();
  cvModalInput.select();
}

function cvCloseModal() {
  rpClosePopover();
  cvModal.hidden = true;
  document.body.classList.remove('rp-modal-open');
  cvDraft = null;
  cvEditingId = null;
  if (cvLastFocus?.isConnected) cvLastFocus.focus();
  cvLastFocus = null;
}

function cvSaveModal() {
  if (!cvDraft) return;
  cvDraft.titulo = cvModalInput.value.trim();
  if (!cvDraft.titulo) { cvModalInput.focus(); return; }

  const i = convivenciaRows.findIndex(r => r.id === cvEditingId);
  if (i === -1) convivenciaRows.push(cvDraft);
  else convivenciaRows[i] = cvDraft;

  cvCloseModal();
  renderConvivencia();
  saveConvivencia();
}

function cvDeleteFromModal() {
  convivenciaRows = convivenciaRows.filter(r => r.id !== cvEditingId);
  cvCloseModal();
  renderConvivencia();
  saveConvivencia();
}

cvModalInput?.addEventListener('input', cvSyncSaveState);
cvModalInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') cvSaveModal(); });
cvModalSave?.addEventListener('click', cvSaveModal);
cvModalDelete?.addEventListener('click', cvDeleteFromModal);
document.getElementById('cv-modal-cancel')?.addEventListener('click', cvCloseModal);
document.getElementById('cv-modal-close')?.addEventListener('click', cvCloseModal);
document.getElementById('cv-modal-backdrop')?.addEventListener('click', cvCloseModal);
document.getElementById('cv-add-btn')?.addEventListener('click', () => cvOpenModal());
document.getElementById('cv-empty-add')?.addEventListener('click', () => cvOpenModal());

// Escape: el popover lo cierra el manejador de Reparto; aquí solo el modal.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || rpPopover) return;
  if (cvModal && !cvModal.hidden) cvCloseModal();
});

function cvBuildRow(row) {
  const tr = document.createElement('tr');
  tr.dataset.id = row.id;
  tr.tabIndex = 0;
  tr.setAttribute('role', 'button');
  tr.setAttribute('aria-label', `Editar ${row.titulo || 'fila sin título'}`);

  const tdTitle = document.createElement('td');
  const title = document.createElement('span');
  title.className = 'rp-cell-task' + (row.titulo ? '' : ' rp-placeholder');
  title.textContent = row.titulo || 'Sin título';
  tdTitle.appendChild(title);

  const tdRoom = document.createElement('td');
  const room = cvRoomLabel(row.estancia);
  if (row.estancia) room.className = 'rp-cell-freq';
  else room.textContent = '—';
  tdRoom.appendChild(room);

  tr.append(tdTitle, tdRoom);
  tr.addEventListener('click', () => cvOpenModal(row));
  tr.addEventListener('keydown', (e) => {
    if (e.target !== tr) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cvOpenModal(row); }
  });
  return tr;
}

function renderConvivencia() {
  if (!cvGroups) return;
  cvGroups.innerHTML = '';

  // Una tabla por estado; los estados sin filas no se muestran.
  Object.keys(CV_STATUSES).forEach(key => {
    const rows = convivenciaRows.filter(r => r.estado === key);
    if (!rows.length) return;

    const node = cvGroupTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.status = key;
    node.querySelector('.cv-status-dot').style.setProperty('--cv-status-color', CV_STATUSES[key].color);
    node.querySelector('.rp-group-name').textContent = CV_STATUSES[key].label;
    node.querySelector('.rp-group-count').textContent = rows.length;

    const tbody = node.querySelector('tbody');
    rows.forEach(row => tbody.appendChild(cvBuildRow(row)));
    cvGroups.appendChild(node);
  });

  const hasRows = convivenciaRows.length > 0;
  cvGroups.hidden = !hasRows;
  cvEmptyCard.hidden = hasRows;

  // El contador muestra los temas que siguen abiertos.
  const open = convivenciaRows.filter(r => r.estado !== 'resuelto').length;
  const navSpan = document.querySelector('.nav-item[data-view="convivencia"] .nav-count');
  if (navSpan) navSpan.textContent = open || '';
}

function startConvivenciaListener() {
  renderConvivencia();
  db.ref('convivencia').on('value', (snapshot) => {
    const data = snapshot.val();
    const list = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : []);
    const before = JSON.stringify(convivenciaRows);
    convivenciaRows = list.map(cvNormalizeRow);
    if (JSON.stringify(convivenciaRows) === before) return;
    renderConvivencia();
  }, (error) => {
    const msg = error?.message ?? String(error);
    console.error('[convivencia] Error leyendo convivencia en Firebase:', msg);
    cvShowError(
      /permission/i.test(msg)
        ? 'No se pueden leer los datos: el nodo «convivencia» no tiene permisos en las reglas de Firebase.'
        : `No se pueden leer los datos: ${msg}`
    );
  });
}


// --- Materiales ------------------------------------------------------------
// Utensilios y consumibles que se pueden mencionar con «@» en la descripción
// de las tareas planificadas. Misma UI que Convivencia (estilos rp-).
// MAT_TYPES y materialesItems se declaran junto al blot de menciones.

const matGroups       = document.getElementById('mat-groups');
const matGroupTemplate = document.getElementById('mat-group-template');
const matEmptyCard    = document.getElementById('mat-empty-card');
const matModal        = document.getElementById('mat-modal');
const matModalTitle   = document.getElementById('mat-modal-title');
const matModalInput   = document.getElementById('mat-modal-name');
const matModalType    = document.getElementById('mat-modal-type');
const matModalSave    = document.getElementById('mat-modal-save');
const matModalDelete  = document.getElementById('mat-modal-delete');

let matDraft     = null;   // copia editable del material abierto en el modal
let matEditingId = null;   // null = material nuevo
let matLastFocus = null;

function matNormalizeItem(item, i) {
  const m = item ?? {};
  return {
    id: m.id ?? `mat-legacy-${i}`,
    nombre: typeof m.nombre === 'string' ? m.nombre : '',
    tipo: MAT_TYPES[m.tipo] ? m.tipo : 'utensilio',
  };
}

function matTypeBadge(key) {
  const meta = MAT_TYPES[key];
  const el = document.createElement('span');
  el.className = 'cv-status';
  const dot = document.createElement('span');
  dot.className = 'cv-status-dot';
  dot.style.setProperty('--cv-status-color', meta.color);
  const text = document.createElement('span');
  text.textContent = meta.singular;
  el.append(dot, text);
  return el;
}

// Tareas planificadas cuya descripción menciona el material.
function matTasksUsing(id) {
  return [...detailTaskList.querySelectorAll('.detail-task-item')]
    .filter(tr => (tr.dataset.description ?? '').includes(`data-id="${id}"`))
    .map(tr => tr.querySelector('.detail-task-title')?.textContent ?? '');
}

function matShowError(message) {
  const el = document.getElementById('mat-error');
  if (!el) return;
  el.textContent = message ?? '';
  el.hidden = !message;
}

function saveMateriales() {
  db.ref('materiales').set(materialesItems.length ? materialesItems : null)
    .then(() => matShowError(null))
    .catch((error) => {
      const msg = error?.message ?? String(error);
      console.error('[materiales] Error guardando en Firebase:', msg);
      matShowError(
        /permission/i.test(msg)
          ? 'No se pueden guardar los cambios: el nodo «materiales» no tiene permisos en las reglas de Firebase.'
          : `No se pueden guardar los cambios: ${msg}`
      );
    });
}

function matBuildTypeField() {
  const trigger = rpFieldTrigger();
  const body = trigger.querySelector('.rp-trigger-body');
  const paint = () => { body.innerHTML = ''; body.appendChild(matTypeBadge(matDraft.tipo)); };
  paint();

  trigger.addEventListener('click', () => {
    rpOpenPopover(trigger, (pop, close) => {
      const list = document.createElement('div');
      list.className = 'rp-popover-list';
      Object.keys(MAT_TYPES).forEach(key => {
        const dot = document.createElement('span');
        dot.className = 'cv-status-dot';
        dot.style.setProperty('--cv-status-color', MAT_TYPES[key].color);
        list.appendChild(rpOption({
          label: MAT_TYPES[key].singular,
          selected: matDraft.tipo === key,
          multi: false,
          prefix: dot,
          onClick: () => { matDraft.tipo = key; paint(); close(); },
        }));
      });
      pop.appendChild(list);
    });
  });

  matModalType.innerHTML = '';
  matModalType.appendChild(trigger);
}

function matSyncSaveState() {
  matModalSave.disabled = !matModalInput.value.trim();
}

function matOpenModal(item = null, tipo = 'utensilio') {
  matEditingId = item?.id ?? null;
  matDraft = item
    ? { ...item }
    : { id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, nombre: '', tipo };

  matLastFocus = document.activeElement;
  matModalTitle.textContent = item ? 'Editar material' : 'Nuevo material';
  matModalInput.value = matDraft.nombre;
  matModalDelete.hidden = !item;
  matBuildTypeField();
  matSyncSaveState();

  matModal.hidden = false;
  document.body.classList.add('rp-modal-open');
  matModalInput.focus();
  matModalInput.select();
}

function matCloseModal() {
  rpClosePopover();
  matModal.hidden = true;
  document.body.classList.remove('rp-modal-open');
  matDraft = null;
  matEditingId = null;
  if (matLastFocus?.isConnected) matLastFocus.focus();
  matLastFocus = null;
}

function matSaveModal() {
  if (!matDraft) return;
  matDraft.nombre = matModalInput.value.trim();
  if (!matDraft.nombre) { matModalInput.focus(); return; }

  const i = materialesItems.findIndex(m => m.id === matEditingId);
  if (i === -1) materialesItems.push(matDraft);
  else materialesItems[i] = matDraft;

  matCloseModal();
  renderMateriales();
  saveMateriales();
}

function matDeleteFromModal() {
  const uses = matTasksUsing(matEditingId).length;
  const msg = uses
    ? `Este material se menciona en ${uses} ${uses === 1 ? 'tarea' : 'tareas'}. Las menciones se quedarán como texto tachado. ¿Eliminarlo?`
    : '¿Eliminar este material?';
  if (!confirm(msg)) return;
  materialesItems = materialesItems.filter(m => m.id !== matEditingId);
  matCloseModal();
  renderMateriales();
  saveMateriales();
}

matModalInput?.addEventListener('input', matSyncSaveState);
matModalInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') matSaveModal(); });
matModalSave?.addEventListener('click', matSaveModal);
matModalDelete?.addEventListener('click', matDeleteFromModal);
document.getElementById('mat-modal-cancel')?.addEventListener('click', matCloseModal);
document.getElementById('mat-modal-close')?.addEventListener('click', matCloseModal);
document.getElementById('mat-modal-backdrop')?.addEventListener('click', matCloseModal);
document.getElementById('mat-add-btn')?.addEventListener('click', () => matOpenModal());
document.getElementById('mat-empty-add')?.addEventListener('click', () => matOpenModal());

// Escape: el popover lo cierra el manejador de Reparto; aquí solo el modal.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || rpPopover) return;
  if (matModal && !matModal.hidden) matCloseModal();
});

function matBuildRow(item) {
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  tr.tabIndex = 0;
  tr.setAttribute('role', 'button');
  tr.setAttribute('aria-label', `Editar ${item.nombre}`);

  const tdName = document.createElement('td');
  const name = document.createElement('span');
  name.className = 'rp-cell-task';
  name.textContent = item.nombre;
  tdName.appendChild(name);

  const tdUses = document.createElement('td');
  const tasks = matTasksUsing(item.id);
  const uses = document.createElement('span');
  if (tasks.length) {
    uses.className = 'rp-cell-freq';
    uses.textContent = tasks.join(', ');
    uses.title = tasks.join('\n');
  } else {
    uses.className = 'rp-placeholder';
    uses.textContent = '—';
  }
  tdUses.appendChild(uses);

  tr.append(tdName, tdUses);
  tr.addEventListener('click', () => matOpenModal(item));
  tr.addEventListener('keydown', (e) => {
    if (e.target !== tr) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); matOpenModal(item); }
  });
  return tr;
}

function renderMateriales() {
  if (!matGroups) return;
  matGroups.innerHTML = '';

  // Una tabla por tipo; los tipos sin materiales no se muestran.
  Object.keys(MAT_TYPES).forEach(key => {
    const items = materialesItems
      .filter(m => m.tipo === key)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (!items.length) return;

    const node = matGroupTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.tipo = key;
    node.querySelector('.cv-status-dot').style.setProperty('--cv-status-color', MAT_TYPES[key].color);
    node.querySelector('.rp-group-name').textContent = MAT_TYPES[key].label;
    node.querySelector('.rp-group-count').textContent = items.length;

    const tbody = node.querySelector('tbody');
    items.forEach(item => tbody.appendChild(matBuildRow(item)));
    matGroups.appendChild(node);
  });

  const hasItems = materialesItems.length > 0;
  matGroups.hidden = !hasItems;
  matEmptyCard.hidden = hasItems;

  const navSpan = document.querySelector('.nav-item[data-view="materiales"] .nav-count');
  if (navSpan) navSpan.textContent = materialesItems.length || '';
}

function startMaterialesListener() {
  renderMateriales();
  db.ref('materiales').on('value', (snapshot) => {
    const data = snapshot.val();
    const list = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : []);
    const before = JSON.stringify(materialesItems);
    materialesItems = list.map(matNormalizeItem);
    if (JSON.stringify(materialesItems) === before) return;
    renderMateriales();
  }, (error) => {
    const msg = error?.message ?? String(error);
    console.error('[materiales] Error leyendo materiales en Firebase:', msg);
    matShowError(
      /permission/i.test(msg)
        ? 'No se pueden leer los datos: el nodo «materiales» no tiene permisos en las reglas de Firebase.'
        : `No se pueden leer los datos: ${msg}`
    );
  });
}
