(function () {
  'use strict';

  // ============================================
  // CONSTANTS & STORAGE
  // ============================================
  const SESSION_KEY = 'care_current_user';
  const THEME_KEY = 'care_theme';
  const EMP_KEY = 'care_employees';

  const session = JSON.parse(localStorage.getItem(SESSION_KEY));
  const userSuffix = session ? '_' + session.email : '';

  const BRAINSTORM_KEY = 'care_brainstorm' + userSuffix;
  const EQUIP_KEY = 'care_equipment' + userSuffix;

  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // ============================================
  // DATA LOADERS
  // ============================================
  function loadIdeas() {
    try { return JSON.parse(localStorage.getItem(BRAINSTORM_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveIdeas(list) {
    localStorage.setItem(BRAINSTORM_KEY, JSON.stringify(list));
  }
  function loadEquipment() {
    try { return JSON.parse(localStorage.getItem(EQUIP_KEY)) || []; }
    catch (e) { return []; }
  }
  function loadEmployees() {
    try { return JSON.parse(localStorage.getItem(EMP_KEY + userSuffix)) || []; }
    catch (e) { return []; }
  }

  // Initialize as empty if it doesn't exist
  if (!localStorage.getItem(BRAINSTORM_KEY)) {
    saveIdeas([]);
  }

  let ideas = loadIdeas();
  const equipment = loadEquipment();
  const equipMap = {};
  equipment.forEach(e => equipMap[e.id] = e);

  let currentUserName = '';
  if (session) {
    currentUserName = session.name || '';
  }

  // ============================================
  // HELPERS
  // ============================================
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function getInitials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
  function equipName(id) {
    return equipMap[id] ? equipMap[id].name : null;
  }
  function priorityClass(p) {
    return p === 'high' ? 'p-high' : p === 'medium' ? 'p-med' : 'p-low';
  }
  function priorityLabel(p) {
    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  // ============================================
  // STATE
  // ============================================
  const state = {
    search: '',
    summaryFilter: 'all',
  };

  // ============================================
  // DOM REFS
  // ============================================
  const board = document.getElementById('kanbanBoard');
  const boardEmpty = document.getElementById('boardEmpty');
  const lists = {
    backlog:    document.getElementById('listBacklog'),
    inprogress: document.getElementById('listInprogress'),
    done:       document.getElementById('listDone'),
  };
  const colCounts = {
    backlog:    document.getElementById('colCountBacklog'),
    inprogress: document.getElementById('colCountInprogress'),
    done:       document.getElementById('colCountDone'),
  };
  const countAll = document.getElementById('countAll');
  const countHigh = document.getElementById('countHigh');
  const countMine = document.getElementById('countMine');
  const countDone = document.getElementById('countDone');
  const searchInput = document.getElementById('ideaSearch');
  const addIdeaBtn = document.getElementById('addIdeaBtn');
  const emptyAddBtn = document.getElementById('emptyAddBtn');

  // Idea modal
  const ideaModal = document.getElementById('ideaModal');
  const ideaModalTitle = document.getElementById('ideaModalTitle');
  const ideaModalClose = document.getElementById('ideaModalClose');
  const ideaModalCancel = document.getElementById('ideaModalCancel');
  const ideaForm = document.getElementById('ideaForm');
  const ideaId = document.getElementById('ideaId');
  const ideaStatus = document.getElementById('ideaStatus');
  const ideaTitle = document.getElementById('ideaTitle');
  const ideaDesc = document.getElementById('ideaDesc');
  const ideaPriority = document.getElementById('ideaPriority');
  const ideaAssignee = document.getElementById('ideaAssignee');
  const ideaEquipment = document.getElementById('ideaEquipment');
  const ideaStatusField = document.getElementById('ideaStatusField');

  // Detail modal
  const detailModal = document.getElementById('detailModal');
  const detailTitle = document.getElementById('detailTitle');
  const detailBody = document.getElementById('detailBody');
  const detailClose = document.getElementById('detailClose');
  const detailEdit = document.getElementById('detailEdit');
  const detailDelete = document.getElementById('detailDelete');
  let detailIdeaId = null;

  // Delete modal
  const deleteModal = document.getElementById('deleteModal');
  const deleteClose = document.getElementById('deleteClose');
  const deleteCancel = document.getElementById('deleteCancel');
  const deleteConfirm = document.getElementById('deleteConfirm');
  const deleteName = document.getElementById('deleteName');
  let pendingDeleteId = null;

  const toastEl = document.getElementById('toast');

  // ============================================
  // FILTERING
  // ============================================
  function getFiltered() {
    let list = ideas.slice();

    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.desc || '').toLowerCase().includes(q) ||
        (i.assignee || '').toLowerCase().includes(q) ||
        (equipName(i.equipment) || '').toLowerCase().includes(q)
      );
    }

    if (state.summaryFilter === 'high') list = list.filter(i => i.priority === 'high');
    else if (state.summaryFilter === 'mine') {
      list = list.filter(i => (i.assignee || '').toLowerCase() === currentUserName.toLowerCase());
    } else if (state.summaryFilter === 'done') list = list.filter(i => i.status === 'done');

    return list;
  }

  // ============================================
  // CARD RENDER
  // ============================================
  function renderCard(idea) {
    const eq = equipName(idea.equipment);
    const assignee = idea.assignee || '';
    return `
      <div class="idea-card priority-${idea.priority}" draggable="true" data-id="${escapeHtml(idea.id)}">
        <div class="idea-title">${escapeHtml(idea.title)}</div>
        ${idea.desc ? `<div class="idea-desc">${escapeHtml(idea.desc)}</div>` : ''}
        <div class="idea-meta">
          <span class="idea-priority-pill ${priorityClass(idea.priority)}">${priorityLabel(idea.priority)}</span>
          ${eq ? `<span class="idea-tag"><i class="fas fa-microchip"></i> ${escapeHtml(eq)}</span>` : ''}
          ${assignee ? `<span class="idea-assignee"><span class="idea-avatar">${escapeHtml(getInitials(assignee))}</span></span>` : ''}
        </div>
      </div>
    `;
  }

  // ============================================
  // RENDER
  // ============================================
  function render() {
    const filtered = getFiltered();

    // count chips
    countAll.textContent = ideas.length;
    countHigh.textContent = ideas.filter(i => i.priority === 'high').length;
    countMine.textContent = ideas.filter(i => (i.assignee || '').toLowerCase() === currentUserName.toLowerCase()).length;
    countDone.textContent = ideas.filter(i => i.status === 'done').length;

    // per-column counts (total, not filtered)
    colCounts.backlog.textContent = ideas.filter(i => i.status === 'backlog').length;
    colCounts.inprogress.textContent = ideas.filter(i => i.status === 'inprogress').length;
    colCounts.done.textContent = ideas.filter(i => i.status === 'done').length;

    // empty board state
    if (ideas.length === 0) {
      board.style.display = 'none';
      boardEmpty.style.display = 'flex'; 
      return;
    }
    board.style.display = '';
    boardEmpty.style.display = 'none';

    // group filtered ideas by column
    const grouped = { backlog: [], inprogress: [], done: [] };
    filtered.forEach(i => {
      const s = grouped[i.status] ? i.status : 'backlog';
      grouped[s].push(i);
    });

    // sort each column by priority then createdAt desc
    const priRank = { high: 0, medium: 1, low: 2 };
    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => {
        const p = priRank[a.priority] - priRank[b.priority];
        if (p !== 0) return p;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    });

    // render each column
    Object.keys(lists).forEach(status => {
      const el = lists[status];
      const items = grouped[status];
      if (items.length === 0) {
        el.innerHTML = `<div class="col-empty">Drop ideas here</div>`;
      } else {
        el.innerHTML = items.map((idea, i) =>
          renderCard(idea).replace(
            'class="idea-card',
            `style="animation-delay:${Math.min(i * 0.04, 0.3)}s" class="idea-card`
          )
        ).join('');
      }
    });

    attachCardListeners();
  }

  // ============================================
  // CARD INTERACTIONS (click + drag)
  // ============================================
  function attachCardListeners() {
    document.querySelectorAll('.idea-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (card.classList.contains('dragging')) return;
        const id = card.dataset.id;
        const idea = ideas.find(i => i.id === id);
        if (idea) openDetailModal(idea);
      });

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.classList.add('dragging'), 0);
      });
      
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
      });
    });
  }

  // ============================================
  // DRAG & DROP ON COLUMNS
  // ============================================
  document.querySelectorAll('.kanban-col').forEach(col => {
    const status = col.dataset.status;

    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    
    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });
    
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      const idea = ideas.find(i => i.id === id);
      if (!idea) return;
      if (idea.status === status) return;
      
      idea.status = status;
      saveIdeas(ideas);
      showToast(`Moved to ${status === 'inprogress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}`, 'success');
      render();
    });
  });

  // ============================================
  // IDEA MODAL
  // ============================================
  function openIdeaModal(preset) {
    const editing = preset && preset.id;
    ideaModalTitle.textContent = editing ? 'Edit Idea' : 'New Idea';

    // Populate equipment dropdown
    ideaEquipment.innerHTML = '<option value="">— None —</option>' +
      equipment.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join('');

    // Populate employee dropdown
    const employees = loadEmployees();
    ideaAssignee.innerHTML = '<option value="">-- Unassigned --</option>' +
      employees.map(emp => `<option value="${escapeHtml(emp.name)}">${escapeHtml(emp.name)}</option>`).join('');

    if (editing) {
      const it = ideas.find(i => i.id === preset.id);
      if (it) {
        ideaId.value = it.id;
        ideaTitle.value = it.title;
        ideaDesc.value = it.desc || '';
        ideaPriority.value = it.priority || 'medium';
        ideaAssignee.value = it.assignee || '';
        ideaEquipment.value = it.equipment || '';
        ideaStatusField.value = it.status || 'backlog';
      }
    } else {
      ideaForm.reset();
      ideaId.value = '';
      ideaStatus.value = (preset && preset.status) || 'backlog';
      ideaStatusField.value = (preset && preset.status) || 'backlog';
      ideaPriority.value = 'medium';
    }

    ideaModal.classList.add('open');
    setTimeout(() => ideaTitle.focus(), 100);
  }
  
  function closeIdeaModal() { ideaModal.classList.remove('open'); }

  ideaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = ideaTitle.value.trim();
    if (!title) return;

    const data = {
      title,
      desc: ideaDesc.value.trim(),
      priority: ideaPriority.value,
      assignee: ideaAssignee.value,
      equipment: ideaEquipment.value,
      status: ideaStatusField.value,
    };

    if (ideaId.value) {
      const idx = ideas.findIndex(i => i.id === ideaId.value);
      if (idx > -1) {
        ideas[idx] = { ...ideas[idx], ...data };
        showToast('Idea updated', 'success');
      }
    } else {
      ideas.push({
        id: 'i' + Date.now() + Math.random().toString(36).slice(2, 6),
        createdAt: Date.now(),
        ...data,
      });
      showToast('Idea added', 'success');
    }

    saveIdeas(ideas);
    closeIdeaModal();
    render();
  });

  // ============================================
  // DETAIL MODAL
  // ============================================
  function openDetailModal(idea) {
    detailIdeaId = idea.id;
    detailTitle.textContent = idea.title;
    const eq = equipName(idea.equipment);

    detailBody.innerHTML = `
      ${idea.desc ? `<div class="detail-desc">${escapeHtml(idea.desc)}</div>` : ''}
      <div class="detail-row">
        <span class="label"><i class="fas fa-flag"></i> Priority</span>
        <span class="value">
          <span class="idea-priority-pill ${priorityClass(idea.priority)}">${priorityLabel(idea.priority)}</span>
        </span>
      </div>
      <div class="detail-row">
        <span class="label"><i class="fas fa-columns"></i> Status</span>
        <span class="value">${idea.status === 'inprogress' ? 'In Progress' : idea.status.charAt(0).toUpperCase() + idea.status.slice(1)}</span>
      </div>
      ${idea.assignee ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-user"></i> Assignee</span>
          <span class="value">${escapeHtml(idea.assignee)}</span>
        </div>` : ''}
      ${eq ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-microchip"></i> Equipment</span>
          <span class="value">${escapeHtml(eq)}</span>
        </div>` : ''}
    `;

    detailModal.classList.add('open');
  }
  
  function closeDetailModal() { detailModal.classList.remove('open'); detailIdeaId = null; }

  detailClose.addEventListener('click', closeDetailModal);
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

  detailEdit.addEventListener('click', () => {
    if (!detailIdeaId) return;
    const it = ideas.find(i => i.id === detailIdeaId);
    closeDetailModal();
    if (it) openIdeaModal({ id: it.id });
  });

  detailDelete.addEventListener('click', () => {
    if (!detailIdeaId) return;
    const it = ideas.find(i => i.id === detailIdeaId);
    closeDetailModal();
    if (it) openDeleteModal(it);
  });

  // ============================================
  // DELETE
  // ============================================
  function openDeleteModal(idea) {
    pendingDeleteId = idea.id;
    deleteName.textContent = idea.title;
    deleteModal.classList.add('open');
  }
  
  function closeDeleteModal() {
    deleteModal.classList.remove('open');
    pendingDeleteId = null;
  }
  
  deleteClose.addEventListener('click', closeDeleteModal);
  deleteCancel.addEventListener('click', closeDeleteModal);
  deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

  deleteConfirm.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    ideas = ideas.filter(i => i.id !== pendingDeleteId);
    saveIdeas(ideas);
    closeDeleteModal();
    showToast('Idea deleted', 'success');
    render();
  });

  // ============================================
  // EVENT BINDINGS
  // ============================================
  addIdeaBtn.addEventListener('click', () => openIdeaModal());
  emptyAddBtn.addEventListener('click', () => openIdeaModal());
  ideaModalClose.addEventListener('click', closeIdeaModal);
  ideaModalCancel.addEventListener('click', closeIdeaModal);
  ideaModal.addEventListener('click', (e) => { if (e.target === ideaModal) closeIdeaModal(); });

  // column + buttons
  document.querySelectorAll('.col-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.addTo;
      openIdeaModal({ status });
    });
  });

  // search
  let searchTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      render();
    }, 150);
  });

  // summary chips
  document.querySelectorAll('.summary-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.summary-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.summaryFilter = chip.dataset.filter;
      render();
    });
  });

  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeIdeaModal();
      closeDetailModal();
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
  // INIT
  // ============================================
  render();
})();