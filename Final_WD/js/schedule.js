(function () {
  'use strict';

  // ============================================
  // CONSTANTS & STORAGE
  // ============================================
    const session = JSON.parse(localStorage.getItem('care_current_user'));
  const userSuffix = session ? '_' + session.email : '';

  const SCHEDULE_KEY = 'care_schedule' + userSuffix;
  const EQUIP_KEY = 'care_equipment' + userSuffix; // Needs this to link tasks to equipment
  const THEME_KEY = 'care_theme';

  // ---- Theme sync ----
  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // ---- Data layer ----
  function loadTasks() {
    try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveTasks(list) {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(list));
  }
  function loadEquipment() {
    try { return JSON.parse(localStorage.getItem(EQUIP_KEY)) || []; }
    catch (e) { return []; }
  }

  // Seed sample tasks on first visit
  // Seed sample tasks on first visit
  if (!localStorage.getItem(SCHEDULE_KEY)) {
    saveTasks([]);
  }
  let tasks = loadTasks();

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
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
  function isOverdue(task) {
    if (task.done) return false;
    return task.date < todayISO();
  }

  // ============================================
  // STATE
  // ============================================
  const state = {
    view: 'calendar',
    currentMonth: new Date(),
    selectedDate: null,
    search: '',
    statusFilter: 'all',
    priorityFilter: 'all',
    summaryFilter: 'all',
  };

  // ============================================
  // DOM REFS
  // ============================================
  const calendarView = document.getElementById('calendarView');
  const listView = document.getElementById('listView');
  const viewSwitch = document.getElementById('viewSwitch');
  const monthLabel = document.getElementById('monthLabel');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');
  const goToday = document.getElementById('goToday');
  const calendarGrid = document.getElementById('calendarGrid');
  const taskList = document.getElementById('taskList');
  const taskEmpty = document.getElementById('taskEmpty');
  const taskSearch = document.getElementById('taskSearch');
  const filterStatus = document.getElementById('filterStatus');
  const filterPriority = document.getElementById('filterPriority');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const emptyTaskAdd = document.getElementById('emptyTaskAdd');

  const countAllTasks = document.getElementById('countAllTasks');
  const countToday = document.getElementById('countToday');
  const countWeek = document.getElementById('countWeek');
  const countOverdue = document.getElementById('countOverdue');
  const countDone = document.getElementById('countDone');

  // Task modal
  const taskModal = document.getElementById('taskModal');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskModalClose = document.getElementById('taskModalClose');
  const taskModalCancel = document.getElementById('taskModalCancel');
  const taskForm = document.getElementById('taskForm');
  const taskId = document.getElementById('taskId');
  const taskTitle = document.getElementById('taskTitle');
  const taskDate = document.getElementById('taskDate');
  const taskTime = document.getElementById('taskTime');
  const taskEquipment = document.getElementById('taskEquipment');
  const taskPriority = document.getElementById('taskPriority');
  const taskAssignee = document.getElementById('taskAssignee');
  const taskNotes = document.getElementById('taskNotes');

  // Detail modal
  const detailModal = document.getElementById('detailModal');
  const detailTitle = document.getElementById('detailTitle');
  const detailBody = document.getElementById('detailBody');
  const detailClose = document.getElementById('detailClose');
  const detailEdit = document.getElementById('detailEdit');
  const detailDelete = document.getElementById('detailDelete');
  let detailTaskId = null;

  // Delete modal
  const deleteTaskModal = document.getElementById('deleteTaskModal');
  const deleteTaskClose = document.getElementById('deleteTaskClose');
  const deleteTaskCancel = document.getElementById('deleteTaskCancel');
  const deleteTaskConfirm = document.getElementById('deleteTaskConfirm');
  const deleteTaskName = document.getElementById('deleteTaskName');
  let pendingDeleteTaskId = null;

  const toastEl = document.getElementById('toast');

  // ============================================
  // EQUIPMENT LOOKUP (for dropdown + display)
  // ============================================

  
  const equipment = loadEquipment();
  const equipMap = {};
  equipment.forEach(e => equipMap[e.id] = e);
  function equipName(id) {
    return equipMap[id] ? equipMap[id].name : null;
  }
  // ============================================
  // employees (for dropdown + display)
  // ============================================

    const EMP_KEY = 'care_employees';
  function loadEmployees() {
    try { return JSON.parse(localStorage.getItem(EMP_KEY)) || []; }
    catch (e) { return []; }
  }

  function populateEmployeeDropdown() {
    const employees = loadEmployees();
    const select = document.getElementById('taskAssignee');
    
    select.innerHTML = '<option value="">-- Unassigned --</option>' + 
      employees.map(emp => `<option value="${escapeHtml(emp.name)}">${escapeHtml(emp.name)}</option>`).join('');
  }
  // ============================================
  // SUMMARY COUNTS
  // ============================================
  function updateSummary() {
    const today = todayISO();
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const dow = startOfWeek.getDay(); // 0 = Sun
    const diffToMon = (dow === 0 ? -6 : 1 - dow);
    startOfWeek.setDate(startOfWeek.getDate() + diffToMon);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const sow = startOfWeek.toISOString().slice(0, 10);
    const eow = endOfWeek.toISOString().slice(0, 10);

    let all = 0, todayCount = 0, weekCount = 0, overdue = 0, done = 0;
    tasks.forEach(t => {
      all++;
      if (t.done) done++;
      if (!t.done && t.date === today) todayCount++;
      if (!t.done && t.date >= sow && t.date <= eow) weekCount++;
      if (!t.done && t.date < today) overdue++;
    });
    countAllTasks.textContent = all;
    countToday.textContent = todayCount;
    countWeek.textContent = weekCount;
    countOverdue.textContent = overdue;
    countDone.textContent = done;
  }

  // ============================================
  // CALENDAR RENDER
  // ============================================
  function renderCalendar() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startDay = firstOfMonth.getDay(); // 0 = Sun
    const daysInMonth = lastOfMonth.getDate();
    

    const firstCell = new Date(firstOfMonth);
    firstCell.setDate(firstCell.getDate() - startDay);

    const today = toISODate(new Date()); 
    const cells = [];

    // DOW headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
      cells.push(`<div class="cal-dow">${d}</div>`);
    });

    function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(firstCell);
      cellDate.setDate(firstCell.getDate() + i);
      const iso = toISODate(cellDate);
      const isOtherMonth = cellDate.getMonth() !== month;
      const isToday = iso === today;
      const isSelected = state.selectedDate === iso;

      const dayTasks = tasks.filter(t => t.date === iso)
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return (a.time || '').localeCompare(b.time || '');
        });

      const maxShow = 3;
      const shown = dayTasks.slice(0, maxShow);
      const extra = dayTasks.length - shown.length;

      const taskEls = shown.map(t => {
        const cls = `cal-task priority-${t.priority}${t.done ? ' done' : ''}`;
        return `<div class="${cls}" data-task-id="${escapeHtml(t.id)}" title="${escapeHtml(t.title)}">
                  <span class="task-text">${escapeHtml(t.title)}</span>
                </div>`;
      }).join('');

      const moreEl = extra > 0 ? `<div class="cal-more" data-date="${iso}">+${extra} more</div>` : '';

      cells.push(`
        <div class="cal-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${iso}">
          <div class="cal-day-num">${cellDate.getDate()}</div>
          ${taskEls}
          ${moreEl}
        </div>
      `);
    }

    monthLabel.textContent = state.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = cells.join('');

    // Click handlers
    calendarGrid.querySelectorAll('.cal-day').forEach(day => {
      day.addEventListener('click', (e) => {
        if (e.target.closest('.cal-task') || e.target.closest('.cal-more')) return;
        const iso = day.dataset.date;
        state.selectedDate = iso;
        renderCalendar();
        openTaskForDate(iso);
      });
    });
    calendarGrid.querySelectorAll('.cal-task').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.taskId;
        const task = tasks.find(t => t.id === id);
        if (task) openDetailModal(task);
      });
    });
    calendarGrid.querySelectorAll('.cal-more').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const iso = el.dataset.date;
        // switch to list view filtered to that date
        switchView('list');
        taskSearch.value = '';
        filterStatus.value = 'all';
        filterPriority.value = 'all';
        state.search = '';
        state.statusFilter = 'all';
        state.priorityFilter = 'all';
        state.summaryFilter = 'all';
        document.querySelectorAll('.summary-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.summary-chip[data-filter="all"]').classList.add('active');
        renderList();
        // scroll to first task for that date
        const target = tasks.find(t => t.date === iso);
        if (target) setTimeout(() => {
          const row = document.querySelector(`.task-row[data-id="${target.id}"]`);
          if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      });
    });
  }

  function openTaskForDate(iso) {
    openTaskModal({
      date: iso,
      time: '09:00',
      priority: 'medium',
    });
  }
  monthLabel.textContent = state.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ============================================
  // LIST RENDER
  // ============================================
  function getFilteredTasks() {
    let list = tasks.slice();

    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.assignee || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (equipName(t.equipment) || '').toLowerCase().includes(q)
      );
    }

    if (state.statusFilter !== 'all') {
      list = list.filter(t => {
        if (state.statusFilter === 'done') return t.done;
        if (state.statusFilter === 'pending') return !t.done && !isOverdue(t);
        if (state.statusFilter === 'overdue') return isOverdue(t);
        return true;
      });
    }

    if (state.priorityFilter !== 'all') {
      list = list.filter(t => t.priority === state.priorityFilter);
    }

    // summary chips
    if (state.summaryFilter !== 'all') {
      const today = todayISO();
      if (state.summaryFilter === 'today') list = list.filter(t => !t.done && t.date === today);
      else if (state.summaryFilter === 'week') {
        const s = new Date(); s.setHours(0,0,0,0);
        const dow = s.getDay();
        s.setDate(s.getDate() + (dow === 0 ? -6 : 1 - dow));
        const e = new Date(s); e.setDate(e.getDate() + 6);
        const sow = s.toISOString().slice(0,10), eow = e.toISOString().slice(0,10);
        list = list.filter(t => !t.done && t.date >= sow && t.date <= eow);
      } else if (state.summaryFilter === 'overdue') list = list.filter(t => isOverdue(t));
      else if (state.summaryFilter === 'done') list = list.filter(t => t.done);
    }

    // Sort: undone first, by date/time asc, then done
    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.time || '').localeCompare(b.time || '');
    });

    return list;
  }

  function renderList() {
    const list = getFilteredTasks();

    if (list.length === 0) {
      taskList.innerHTML = '';
      taskEmpty.style.display = 'block';
      if (tasks.length === 0) {
        taskEmpty.querySelector('h3').textContent = 'No tasks scheduled';
        taskEmpty.querySelector('p').textContent = 'Create your first maintenance task to keep everything on track.';
        emptyTaskAdd.style.display = '';
      } else {
        taskEmpty.querySelector('h3').textContent = 'No matching tasks';
        taskEmpty.querySelector('p').textContent = 'Try adjusting your search or filters.';
        emptyTaskAdd.style.display = 'none';
      }
      return;
    }

    taskEmpty.style.display = 'none';

    taskList.innerHTML = list.map((t, i) => {
      const overdue = isOverdue(t);
      const dateObj = new Date(t.date + 'T00:00:00');
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
      const eqName = equipName(t.equipment);

      const rowClasses = [
        'task-row',
        'priority-' + t.priority,
        t.done ? 'done' : '',
        overdue ? 'overdue' : '',
      ].filter(Boolean).join(' ');

      return `
        <div class="${rowClasses}" data-id="${escapeHtml(t.id)}" style="animation-delay:${Math.min(i*0.03, 0.3)}s">
          <button class="task-check ${t.done ? 'checked' : ''}" data-action="toggle" data-id="${escapeHtml(t.id)}" title="${t.done ? 'Mark as pending' : 'Mark as done'}">
            <i class="fas fa-check"></i>
          </button>

          <div class="task-date-badge">
            <div class="day">${day}</div>
            <div class="month">${month}</div>
          </div>

                      <div class="task-meta">
              ${t.time ? `<span><i class="fas fa-clock"></i> ${fmtTime(t.time)}</span>` : ''}
              ${eqName ? `<span><i class="fas fa-microchip"></i> ${escapeHtml(eqName)}</span>` : ''}
              ${t.assignee ? `<span><i class="fas fa-user"></i> ${escapeHtml(t.assignee)}</span>` : ''}
              ${overdue ? `<span style="color:var(--danger);font-weight:700"><i class="fas fa-exclamation-circle"></i> Overdue</span>` : ''}
            </div>

          <div class="task-actions">
            <button data-action="edit" data-id="${escapeHtml(t.id)}" title="Edit">
              <i class="fas fa-pen"></i>
            </button>
            <button class="danger" data-action="delete" data-id="${escapeHtml(t.id)}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============================================
  // VIEW SWITCHER
  // ============================================
  function switchView(view) {
    state.view = view;
    viewSwitch.querySelectorAll('.view-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
    calendarView.classList.toggle('active', view === 'calendar');
    listView.classList.toggle('active', view === 'list');
    if (view === 'calendar') renderCalendar();
    else renderList();
  }
  viewSwitch.querySelectorAll('.view-btn').forEach(b => {
    b.addEventListener('click', () => switchView(b.dataset.view));
  });

  // ============================================
  // TASK MODAL
  // ============================================
  function openTaskModal(preset) {
    populateEmployeeDropdown();
    const editing = preset && preset.id;
    taskModalTitle.textContent = editing ? 'Edit Task' : 'New Task';

    // Populate equipment options
    taskEquipment.innerHTML = '<option value="">— None / General —</option>' +
      equipment.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join('');

    if (editing) {
      const t = tasks.find(x => x.id === preset.id);
      if (t) {
        taskId.value = t.id;
        taskTitle.value = t.title;
        taskDate.value = t.date;
        taskTime.value = t.time || '';
        taskEquipment.value = t.equipment || '';
        taskPriority.value = t.priority || 'medium';
        taskAssignee.value = t.assignee || '';
        taskNotes.value = t.notes || '';
      }
    } else {
      taskForm.reset();
      taskId.value = '';
      taskDate.value = (preset && preset.date) || todayISO();
      taskTime.value = (preset && preset.time) || '09:00';
      taskPriority.value = (preset && preset.priority) || 'medium';
    }

    taskModal.classList.add('open');
    setTimeout(() => taskTitle.focus(), 100);
  }

  function closeTaskModal() { taskModal.classList.remove('open'); }

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskTitle.value.trim();
    const date = taskDate.value;
    if (!title || !date) return;

    const data = {
      title,
      date,
      time: taskTime.value,
      equipment: taskEquipment.value,
      priority: taskPriority.value,
      assignee: taskAssignee.value.trim(),
      notes: taskNotes.value.trim(),
    };

    if (taskId.value) {
      const idx = tasks.findIndex(t => t.id === taskId.value);
      if (idx > -1) {
        tasks[idx] = { ...tasks[idx], ...data };
        showToast('Task updated', 'success');
      }
    } else {
      tasks.push({
        id: 't' + Date.now() + Math.random().toString(36).slice(2, 6),
        done: false,
        ...data,
      });
      showToast('Task created', 'success');
    }

    saveTasks(tasks);
    closeTaskModal();
    updateSummary();
    renderCalendar();
    renderList();
  });

  // ============================================
  // TASK DETAIL MODAL
  // ============================================
  function openDetailModal(task) {
    detailTaskId = task.id;
    detailTitle.textContent = task.title;
    const eqName = equipName(task.equipment);
    const overdue = isOverdue(task);

    detailBody.innerHTML = `
      <div class="detail-row">
        <span class="label"><i class="fas fa-calendar"></i> Date</span>
        <span class="value">${escapeHtml(fmtDate(task.date))}${task.time ? ' · ' + fmtTime(task.time) : ''}</span>
      </div>
      <div class="detail-row">
        <span class="label"><i class="fas fa-flag"></i> Priority</span>
        <span class="value">
          <span class="priority-pill ${task.priority === 'high' ? 'p-high' : task.priority === 'medium' ? 'p-med' : 'p-low'}">
            ${task.priority}
          </span>
        </span>
      </div>
      ${eqName ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-microchip"></i> Equipment</span>
          <span class="value">${escapeHtml(eqName)}</span>
        </div>` : ''}
      ${task.assignee ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-user"></i> Assignee</span>
          <span class="value">${escapeHtml(task.assignee)}</span>
        </div>` : ''}
      ${task.notes ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-sticky-note"></i> Notes</span>
          <span class="value">${escapeHtml(task.notes)}</span>
        </div>` : ''}
      <div class="detail-row">
        <span class="label"><i class="fas fa-info-circle"></i> Status</span>
        <span class="value">
          ${task.done ? '<span style="color:var(--success)">✓ Completed</span>' :
            overdue ? '<span style="color:var(--danger)">Overdue</span>' :
            '<span style="color:var(--warning)">Pending</span>'}
        </span>
      </div>
    `;

    detailModal.classList.add('open');
  }

  function closeDetailModal() { detailModal.classList.remove('open'); detailTaskId = null; }

  detailClose.addEventListener('click', closeDetailModal);
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

  detailEdit.addEventListener('click', () => {
    if (!detailTaskId) return;
    const t = tasks.find(x => x.id === detailTaskId);
    closeDetailModal();
    if (t) openTaskModal({ id: t.id });
  });

  detailDelete.addEventListener('click', () => {
    if (!detailTaskId) return;
    const t = tasks.find(x => x.id === detailTaskId);
    closeDetailModal();
    if (t) openDeleteTaskModal(t);
  });

  // ============================================
  // DELETE
  // ============================================
  function openDeleteTaskModal(task) {
    pendingDeleteTaskId = task.id;
    deleteTaskName.textContent = task.title;
    deleteTaskModal.classList.add('open');
  }
  function closeDeleteTaskModal() {
    deleteTaskModal.classList.remove('open');
    pendingDeleteTaskId = null;
  }
  deleteTaskClose.addEventListener('click', closeDeleteTaskModal);
  deleteTaskCancel.addEventListener('click', closeDeleteTaskModal);
  deleteTaskModal.addEventListener('click', (e) => { if (e.target === deleteTaskModal) closeDeleteTaskModal(); });

  deleteTaskConfirm.addEventListener('click', () => {
    if (!pendingDeleteTaskId) return;
    tasks = tasks.filter(t => t.id !== pendingDeleteTaskId);
    saveTasks(tasks);
    closeDeleteTaskModal();
    showToast('Task deleted', 'success');
    updateSummary();
    renderCalendar();
    renderList();
  });

  // ============================================
  // EVENT BINDINGS
  // ============================================
  addTaskBtn.addEventListener('click', () => openTaskModal());
  emptyTaskAdd.addEventListener('click', () => openTaskModal());
  taskModalClose.addEventListener('click', closeTaskModal);
  taskModalCancel.addEventListener('click', closeTaskModal);
  taskModal.addEventListener('click', (e) => { if (e.target === taskModal) closeTaskModal(); });

  prevMonth.addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
    renderCalendar();
  });
  nextMonth.addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
    renderCalendar();
  });
  goToday.addEventListener('click', () => {
    state.currentMonth = new Date();
    state.selectedDate = todayISO();
    renderCalendar();
  });

  // List view interactions
  taskList.addEventListener('click', (e) => {
    const checkBtn = e.target.closest('[data-action="toggle"]');
    const editBtn = e.target.closest('[data-action="edit"]');
    const delBtn = e.target.closest('[data-action="delete"]');
    const row = e.target.closest('.task-row');

    if (checkBtn) {
      e.stopPropagation();
      const id = checkBtn.dataset.id;
      const t = tasks.find(x => x.id === id);
      if (t) {
        t.done = !t.done;
        saveTasks(tasks);
        updateSummary();
        renderList();
        renderCalendar();
      }
      return;
    }
    if (editBtn) {
      e.stopPropagation();
      openTaskModal({ id: editBtn.dataset.id });
      return;
    }
    if (delBtn) {
      e.stopPropagation();
      const t = tasks.find(x => x.id === delBtn.dataset.id);
      if (t) openDeleteTaskModal(t);
      return;
    }
    if (row) {
      const t = tasks.find(x => x.id === row.dataset.id);
      if (t) openDetailModal(t);
    }
  });

  // Filters
  let searchTimer;
  taskSearch.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      renderList();
    }, 150);
  });
  filterStatus.addEventListener('change', (e) => { state.statusFilter = e.target.value; renderList(); });
  filterPriority.addEventListener('change', (e) => { state.priorityFilter = e.target.value; renderList(); });

  // Summary chips
  document.querySelectorAll('.summary-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.summary-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.summaryFilter = chip.dataset.filter;
      if (state.view !== 'list') switchView('list');
      else renderList();
    });
  });
  document.querySelector('.summary-chip[data-filter="all"]').classList.add('active');

  // Escape closes all modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeDetailModal();
      closeDeleteTaskModal();
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
  state.selectedDate = todayISO();
  state.currentMonth = new Date();
  updateSummary();
  renderCalendar();
  renderList();
})();