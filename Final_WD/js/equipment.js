(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const session = JSON.parse(localStorage.getItem('care_current_user'));
  const userSuffix = session ? '_' + session.email : '';
  const STORAGE_KEY = 'care_equipment' + userSuffix;
  const THEME_KEY = 'care_theme';

  const ICON_MAP = {
    Oven: 'fa-oven',
    Freezer: 'fa-snowflake',
    Mixer: 'fa-blender',
    Fryer: 'fa-fire',
    Other: 'fa-cog',
  };

  // ---- Theme sync ----
  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // ============================================
  // STORAGE
  // ============================================
  function loadEquipment() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveEquipment(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // Seed sample data on first visit
  if (!localStorage.getItem(STORAGE_KEY)) {
  saveEquipment([]); // Starts as an empty array
  }

  let equipment = loadEquipment();

  // ============================================
  // HELPERS
  // ============================================
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
    function fmtDate(iso) {
    if (!iso) return '—'; // If no date, return a dash
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—'; // If invalid date, return a dash
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function daysBetween(a, b) {
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  function getStatus(item) {
    if (!item.next) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(item.next + 'T00:00:00');
    if (isNaN(next.getTime())) return 'none';
    const diff = daysBetween(today, next);
    if (diff < 0) return 'due';
    if (diff <= 7) return 'warn';
    return 'ok';
  }

  function statusLabel(s) {
    return { ok: 'Operational', warn: 'Due Soon', due: 'Overdue', none: 'No Schedule' }[s];
  }

  function serviceHint(item) {
    if (!item.next) return { text: 'Not scheduled', cls: 'muted' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next = new Date(item.next + 'T00:00:00');
    const diff = daysBetween(today, next);
    if (diff < 0) return { text: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`, cls: 'urgent' };
    if (diff === 0) return { text: 'Due today', cls: 'urgent' };
    if (diff <= 7) return { text: `In ${diff} day${diff === 1 ? '' : 's'}`, cls: 'warn' };
    return { text: `In ${diff} days`, cls: '' };
  }

  // ============================================
  // STATE
  // ============================================
  const state = {
    search: '',
    typeFilter: 'all',
    statusFilter: 'all',
    sortBy: 'newest',
    view: 'grid',
  };

  // ============================================
  // DOM REFS
  // ============================================
  const equipView = document.getElementById('equipView');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('equipSearch');
  const typeFilter = document.getElementById('filterType');
  const sortBySel = document.getElementById('sortBy');
  const viewToggle = document.getElementById('viewToggle');
  const viewIcon = document.getElementById('viewIcon');
  const addEquipBtn = document.getElementById('addEquipBtn');
  const emptyAddBtn = document.getElementById('emptyAddBtn');

  const countAllEl = document.getElementById('countAll');
  const countOkEl = document.getElementById('countOk');
  const countWarnEl = document.getElementById('countWarn');
  const countDueEl = document.getElementById('countDue');

  // Modal (add/edit)
  const equipModal = document.getElementById('equipModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const equipForm = document.getElementById('equipForm');
  const equipIdInput = document.getElementById('equipId');
  const equipNameInput = document.getElementById('equipName');
  const equipTypeInput = document.getElementById('equipType');
  const equipLocationInput = document.getElementById('equipLocation');
  const equipLastInput = document.getElementById('equipLast');
  const equipNextInput = document.getElementById('equipNext');
  const equipNotesInput = document.getElementById('equipNotes');

  // Delete modal
  const deleteModal = document.getElementById('deleteModal');
  const deleteClose = document.getElementById('deleteClose');
  const deleteCancel = document.getElementById('deleteCancel');
  const deleteConfirm = document.getElementById('deleteConfirm');
  const deleteName = document.getElementById('deleteName');
  let pendingDeleteId = null;

  const toastEl = document.getElementById('toast');

  // ============================================
  // FILTERED LIST
  // ============================================
  function getFiltered() {
    let list = equipment.slice();

    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
      );
    }

    if (state.typeFilter !== 'all') {
      list = list.filter(e => e.type === state.typeFilter);
    }

    if (state.statusFilter !== 'all') {
      list = list.filter(e => getStatus(e) === state.statusFilter);
    }

    switch (state.sortBy) {
      case 'newest':
        list.sort((a, b) => (b.id > a.id ? 1 : -1));
        break;
      case 'oldest':
        list.sort((a, b) => (a.id > b.id ? 1 : -1));
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'service':
        list.sort((a, b) => {
          if (!a.next) return 1;
          if (!b.next) return -1;
          return a.next.localeCompare(b.next);
        });
        break;
    }

    return list;
  }

  // ============================================
  // COUNTS
  // ============================================
  function renderCounts() {
    const all = equipment.length;
    let ok = 0, warn = 0, due = 0;
    equipment.forEach(e => {
      const s = getStatus(e);
      if (s === 'ok') ok++;
      else if (s === 'warn') warn++;
      else if (s === 'due') due++;
    });
    countAllEl.textContent = all;
    countOkEl.textContent = ok;
    countWarnEl.textContent = warn;
    countDueEl.textContent = due;
  }

  // ============================================
  // CARD RENDER
  // ============================================
  function renderCard(item) {
    const status = getStatus(item);
    const hint = serviceHint(item);
    const icon = ICON_MAP[item.type] || 'fa-cog';
    const lastLabel = item.last ? fmtDate(item.last) : '—';
    const nextLabel = item.next ? fmtDate(item.next) : 'Not set';

    return `
      <div class="equip-card" data-id="${escapeHtml(item.id)}">
        <div class="card-top">
          <div class="card-icon"><i class="fas ${icon}"></i></div>
          <div class="card-title-block">
            <div class="card-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="card-meta">
              <i class="fas fa-tag"></i> ${escapeHtml(item.type)}
              ${item.location ? ` · <i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location)}` : ''}
            </div>
          </div>
          <span class="status-badge ${status}">${statusLabel(status)}</span>
        </div>

        <div class="card-info">
          <div class="info-row">
            <span class="label"><i class="fas fa-history"></i> Last service</span>
            <span class="value">${lastLabel}</span>
          </div>
          <div class="info-row">
            <span class="label"><i class="fas fa-calendar-check"></i> Next service</span>
            <span class="value ${hint.cls}">${nextLabel}</span>
          </div>
          <div class="info-row">
            <span class="label"><i class="fas fa-stopwatch"></i> Status</span>
            <span class="value ${hint.cls}">${hint.text}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="card-btn" data-action="edit" data-id="${escapeHtml(item.id)}">
            <i class="fas fa-pen"></i><span> Edit</span>
          </button>
          <button class="card-btn danger" data-action="delete" data-id="${escapeHtml(item.id)}">
            <i class="fas fa-trash"></i><span> Delete</span>
          </button>
        </div>
      </div>
    `;
  }

  // ============================================
  // RENDER
  // ============================================
  function render() {
    renderCounts();

    const list = getFiltered();

    if (list.length === 0) {
      equipView.innerHTML = '';
      equipView.style.display = 'none';
      emptyState.style.display = 'block';

      if (equipment.length > 0) {
        emptyState.querySelector('h3').textContent = 'No matching equipment';
        emptyState.querySelector('p').textContent = 'Try adjusting your search or filters.';
        emptyAddBtn.style.display = 'none';
      } else {
        emptyState.querySelector('h3').textContent = 'No equipment yet';
        emptyState.querySelector('p').textContent = 'Add your first machine or appliance to start tracking maintenance.';
        emptyAddBtn.style.display = '';
      }
      return;
    }

    equipView.style.display = '';
    emptyState.style.display = 'none';
    equipView.className = 'equip-view ' + (state.view === 'list' ? 'list-view' : 'grid-view');

    equipView.innerHTML = list.map((item, i) => {
      return renderCard(item).replace(
        'class="equip-card"',
        `class="equip-card" style="animation-delay:${Math.min(i * 0.04, 0.4)}s"`
      );
    }).join('');
  }

  // ============================================
  // MODAL
  // ============================================
  function openAddModal() {
    modalTitle.textContent = 'Add Equipment';
    equipForm.reset();
    equipIdInput.value = '';
    equipModal.classList.add('open');
    setTimeout(() => equipNameInput.focus(), 100);
  }

  function openEditModal(item) {
    modalTitle.textContent = 'Edit Equipment';
    equipIdInput.value = item.id;
    equipNameInput.value = item.name;
    equipTypeInput.value = item.type;
    equipLocationInput.value = item.location || '';
    equipLastInput.value = item.last || '';
    equipNextInput.value = item.next || '';
    equipNotesInput.value = item.notes || '';
    equipModal.classList.add('open');
    setTimeout(() => equipNameInput.focus(), 100);
  }

  function closeEquipModal() {
    equipModal.classList.remove('open');
  }

  equipForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = equipNameInput.value.trim();
    if (!name) return;

    const data = {
      name,
      type: equipTypeInput.value,
      location: equipLocationInput.value.trim(),
      last: equipLastInput.value,
      next: equipNextInput.value,
      notes: equipNotesInput.value.trim(),
    };

    const id = equipIdInput.value;
    if (id) {
      const idx = equipment.findIndex(e => e.id === id);
      if (idx > -1) {
        equipment[idx] = { ...equipment[idx], ...data };
        showToast('Equipment updated', 'success');
      }
    } else {
      equipment.push({
        id: 'e' + Date.now() + Math.random().toString(36).slice(2, 6),
        ...data,
      });
      showToast('Equipment added', 'success');
    }

    saveEquipment(equipment);
    closeEquipModal();
    render();
  });

  // ============================================
  // DELETE
  // ============================================
  function openDeleteModal(item) {
    pendingDeleteId = item.id;
    deleteName.textContent = item.name;
    deleteModal.classList.add('open');
  }
  function closeDeleteModal() {
    deleteModal.classList.remove('open');
    pendingDeleteId = null;
  }
  deleteConfirm.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    equipment = equipment.filter(e => e.id !== pendingDeleteId);
    saveEquipment(equipment);
    closeDeleteModal();
    showToast('Equipment deleted', 'success');
    render();
  });

  // ============================================
  // EVENT BINDINGS
  // ============================================
  addEquipBtn.addEventListener('click', openAddModal);
  emptyAddBtn.addEventListener('click', openAddModal);
  modalClose.addEventListener('click', closeEquipModal);
  modalCancel.addEventListener('click', closeEquipModal);
  equipModal.addEventListener('click', (e) => {
    if (e.target === equipModal) closeEquipModal();
  });

  deleteClose.addEventListener('click', closeDeleteModal);
  deleteCancel.addEventListener('click', closeDeleteModal);
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Card actions (event delegation)
  equipView.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const item = equipment.find(x => x.id === id);
    if (!item) return;

    if (btn.dataset.action === 'edit') openEditModal(item);
    else if (btn.dataset.action === 'delete') openDeleteModal(item);
  });

  // Search
  let searchTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      render();
    }, 150);
  });

  // Type filter
  typeFilter.addEventListener('change', (e) => {
    state.typeFilter = e.target.value;
    render();
  });

  // Sort
  sortBySel.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    render();
  });

  // Status chips
  document.querySelectorAll('.summary-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.summary-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.statusFilter = chip.dataset.filter;
      render();
    });
  });
  document.querySelector('.summary-chip[data-filter="all"]').classList.add('active');

  // View toggle
  viewToggle.addEventListener('click', () => {
    state.view = state.view === 'grid' ? 'list' : 'grid';
    viewIcon.className = state.view === 'grid' ? 'fas fa-th-large' : 'fas fa-list';
    viewToggle.title = state.view === 'grid' ? 'Switch to list view' : 'Switch to grid view';
    render();
  });

  // Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEquipModal();
      closeDeleteModal();
    }
  });

  // ============================================
  // TOAST
  // ============================================
  let toastTimer;
  function showToast(msg, type = 'success') {
    toastEl.className = 'toast ' + type;
    toastEl.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(msg)}`;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // ============================================
  // AUTO-OPEN FROM URL (?action=add)
  // ============================================
  if (new URLSearchParams(window.location.search).get('action') === 'add') {
    openAddModal();
    history.replaceState(null, '', 'equipment.html');
  }

  // ============================================
  // INIT
  // ============================================
  render();

  // Re-render when theme changes (unlikely, but safe)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      equipment = loadEquipment();
      render();
    }
  });
})();