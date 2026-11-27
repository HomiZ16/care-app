(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================
    const session = JSON.parse(localStorage.getItem('care_current_user'));
  const userSuffix = session ? '_' + session.email : '';

  const SHIFTS_KEY = 'care_shifts' + userSuffix;
  const THEME_KEY = 'care_theme';

  const SHIFT_TYPES = {
    morning:   { label: 'Morning',   time: '6 AM – 2 PM',  dotClass: 'dot-morning' },
    afternoon: { label: 'Afternoon', time: '2 PM – 10 PM', dotClass: 'dot-afternoon' },
    night:     { label: 'Night',     time: '10 PM – 6 AM', dotClass: 'dot-night' },
  };

  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // ============================================
  // STORAGE
  // ============================================
  function loadShifts() {
    try { return JSON.parse(localStorage.getItem(SHIFTS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveShifts(list) {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(list));
  }

  // Seed on first visit
    if (!localStorage.getItem(SHIFTS_KEY)) {
    saveShifts([]);
  }

  let shifts = loadShifts();

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
  function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
  function isoOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
  function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay(); // 0 = Sun
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow)); // Monday start
    return d;
  }
  function fmtLongDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  function fmtShortDate(d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ============================================
  // STATE
  // ============================================
  const state = {
    view: 'week',
    weekStart: startOfWeek(new Date()),
    currentDay: new Date(),
    summaryFilter: 'all',
  };

  // ============================================
  // DOM REFS
  // ============================================
  const weekView = document.getElementById('weekView');
  const dayView = document.getElementById('dayView');
  const weekGrid = document.getElementById('weekGrid');
  const dayShifts = document.getElementById('dayShifts');
  const weekLabel = document.getElementById('weekLabel');
  const weekSub = document.getElementById('weekSub');
  const dayViewTitle = document.getElementById('dayViewTitle');
  const viewSwitch = document.getElementById('viewSwitch');
  const prevWeek = document.getElementById('prevWeek');
  const nextWeek = document.getElementById('nextWeek');
  const goToday = document.getElementById('goToday');
  const prevDay = document.getElementById('prevDay');
  const nextDay = document.getElementById('nextDay');
  const addShiftBtn = document.getElementById('addShiftBtn');

  const countAllShifts = document.getElementById('countAllShifts');
  const countTodayShifts = document.getElementById('countTodayShifts');
  const countMorning = document.getElementById('countMorning');
  const countAfternoon = document.getElementById('countAfternoon');
  const countNight = document.getElementById('countNight');

  // Modal
  const shiftModal = document.getElementById('shiftModal');
  const shiftModalTitle = document.getElementById('shiftModalTitle');
  const shiftModalClose = document.getElementById('shiftModalClose');
  const shiftModalCancel = document.getElementById('shiftModalCancel');
  const shiftForm = document.getElementById('shiftForm');
  const shiftId = document.getElementById('shiftId');
  const shiftName = document.getElementById('shiftName');
  const shiftDate = document.getElementById('shiftDate');
  const shiftType = document.getElementById('shiftType');
  const shiftRole = document.getElementById('shiftRole');
  const shiftPhone = document.getElementById('shiftPhone');
  const shiftNotes = document.getElementById('shiftNotes');

  // Detail modal
  const detailModal = document.getElementById('detailModal');
  const detailTitle = document.getElementById('detailTitle');
  const detailBody = document.getElementById('detailBody');
  const detailClose = document.getElementById('detailClose');
  const detailEdit = document.getElementById('detailEdit');
  const detailDelete = document.getElementById('detailDelete');
  let detailShiftId = null;

  // Delete modal
  const deleteModal = document.getElementById('deleteModal');
  const deleteClose = document.getElementById('deleteClose');
  const deleteCancel = document.getElementById('deleteCancel');
  const deleteConfirm = document.getElementById('deleteConfirm');
  const deleteName = document.getElementById('deleteName');
  let pendingDeleteId = null;

  const toastEl = document.getElementById('toast');

  // ============================================
  // FILTER
  // ============================================
  function getFiltered() {
    let list = shifts.slice();
    const f = state.summaryFilter;
    const today = todayISO();

    if (f === 'today') list = list.filter(s => s.date === today);
    else if (f === 'morning') list = list.filter(s => s.shift === 'morning');
    else if (f === 'afternoon') list = list.filter(s => s.shift === 'afternoon');
    else if (f === 'night') list = list.filter(s => s.shift === 'night');

    return list;
  }
    // ============================================
  // Employees
  // ============================================
    // Load Employees for the dropdown
  const EMP_KEY = 'care_employees';
  function loadEmployees() {
    try { return JSON.parse(localStorage.getItem(EMP_KEY)) || []; }
    catch (e) { return []; }
  }

  function populateEmployeeDropdown() {
    const employees = loadEmployees();
    const select = document.getElementById('shiftName');
    
    // Keep the default option, replace the rest
    select.innerHTML = '<option value="">-- Select Employee --</option>' + 
      employees.map(emp => `<option value="${escapeHtml(emp.name)}">${escapeHtml(emp.name)} (${escapeHtml(emp.role || 'Staff')})</option>`).join('');
  }
  // ============================================
  // SUMMARY COUNTS
  // ============================================
  function updateSummary() {
    const today = todayISO();
    countAllShifts.textContent = shifts.length;
    countTodayShifts.textContent = shifts.filter(s => s.date === today).length;
    countMorning.textContent = shifts.filter(s => s.shift === 'morning').length;
    countAfternoon.textContent = shifts.filter(s => s.shift === 'afternoon').length;
    countNight.textContent = shifts.filter(s => s.shift === 'night').length;
  }

  // ============================================
  // SHIFT CARD RENDER
  // ============================================
  function renderShiftCard(shift) {
    const t = SHIFT_TYPES[shift.shift] || SHIFT_TYPES.morning;
    
    // ADD FALLBACKS HERE: (shift.name || 'Unknown') and (shift.role || 'Staff')
    return `
      <div class="shift-card shift-${shift.shift}" draggable="true" data-id="${escapeHtml(shift.id)}">
        <div class="shift-card-top">
          <div class="shift-avatar">${escapeHtml(getInitials(shift.name || '?'))}</div>
          <div class="shift-name" title="${escapeHtml(shift.name || 'Unknown')}">${escapeHtml(shift.name || 'Unknown')}</div>
          <span class="shift-type-pill">${t.label.charAt(0)}</span>
        </div>
        ${shift.role ? `<div class="shift-role">${escapeHtml(shift.role)}</div>` : ''}
      </div>
    `;
  }

  // ============================================
  // WEEK VIEW RENDER
  // ============================================
  function renderWeek() {
    const start = state.weekStart;
    const end = new Date(start); end.setDate(end.getDate() + 6);
    weekLabel.textContent = `${fmtShortDate(start)} – ${fmtShortDate(end)}, ${end.getFullYear()}`;

    // "This week" / "Next week" / "Previous week" subtitle
    const thisWeekStart = startOfWeek(new Date());
    const diffWeeks = Math.round((start - thisWeekStart) / (1000 * 60 * 60 * 24 * 7));
    if (diffWeeks === 0) weekSub.textContent = 'This week';
    else if (diffWeeks === 1) weekSub.textContent = 'Next week';
    else if (diffWeeks === -1) weekSub.textContent = 'Last week';
    else if (diffWeeks > 1) weekSub.textContent = `${diffWeeks} weeks ahead`;
    else weekSub.textContent = `${Math.abs(diffWeeks)} weeks ago`;

    const filtered = getFiltered();
    const today = todayISO();

    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoOf(d);
      const isToday = iso === today;
      const dayShiftsList = filtered
        .filter(s => s.date === iso)
        .sort((a, b) => {
          const rank = { morning: 0, afternoon: 1, night: 2 };
          return rank[a.shift] - rank[b.shift];
        });

      const shiftEls = dayShiftsList.map(renderShiftCard).join('');
      const emptyEl = dayShiftsList.length === 0
        ? `<div class="day-empty">No shifts</div>`
        : '';

      html += `
        <div class="day-col ${isToday ? 'today' : ''}" data-date="${iso}" style="animation-delay:${i * 0.04}s">
          <div class="day-col-header">
            <div class="dow">${dayNames[i]}</div>
            <div class="date-num">${d.getDate()}</div>
            <div class="date-month">${d.toLocaleDateString('en-US', { month: 'short' })}</div>
            <button class="day-add" data-date="${iso}" title="Add shift for this day">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="day-shifts-list" data-drop-date="${iso}">
            ${shiftEls}
            ${emptyEl}
          </div>
        </div>
      `;
    }

    weekGrid.innerHTML = html;

    // Attach drag/drop + click handlers
    attachWeekListeners();
  }

  // ============================================
  // DAY VIEW RENDER
  // ============================================
  function renderDay() {
    const d = state.currentDay;
    dayViewTitle.textContent = fmtLongDate(d);
    const iso = isoOf(d);
    const filtered = getFiltered();
    const dayShiftsList = filtered.filter(s => s.date === iso);

    let html = '';
    ['morning', 'afternoon', 'night'].forEach(type => {
      const t = SHIFT_TYPES[type];
      const items = dayShiftsList
        .filter(s => s.shift === type)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const shiftEls = items.map(renderShiftCard).join('');
      const emptyEl = items.length === 0
        ? `<div class="day-empty">No one assigned</div>`
        : '';

      html += `
        <div class="day-shift-col ${type}" data-drop-date="${iso}" data-drop-shift="${type}">
          <div class="day-shift-header">
            <div>
              <h4><span class="dot ${t.dotClass}"></span> ${t.label}</h4>
              <span class="shift-time-label">${t.time}</span>
            </div>
            <button class="day-shift-add" data-date="${iso}" data-shift="${type}" title="Assign someone">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="day-shift-list">
            ${shiftEls}
            ${emptyEl}
          </div>
        </div>
      `;
    });

    dayShifts.innerHTML = html;
    attachDayListeners();
  }

  // ============================================
  // LISTENERS — WEEK VIEW
  // ============================================
  function attachWeekListeners() {
    // Shift card click → detail
    weekGrid.querySelectorAll('.shift-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (card.classList.contains('dragging')) return;
        const id = card.dataset.id;
        const shift = shifts.find(s => s.id === id);
        if (shift) openDetailModal(shift);
      });
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.classList.add('dragging'), 0);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        weekGrid.querySelectorAll('.day-col').forEach(c => c.classList.remove('drag-over'));
      });
    });

    // Add buttons
    weekGrid.querySelectorAll('.day-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openShiftModal({ date: btn.dataset.date });
      });
    });

    // Drop targets
    weekGrid.querySelectorAll('.day-col').forEach(col => {
      const targetDate = col.dataset.date;
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
        const shift = shifts.find(s => s.id === id);
        if (!shift) return;
        if (shift.date === targetDate) return;
        shift.date = targetDate;
        saveShifts(shifts);
        showToast('Shift moved', 'success');
        updateSummary();
        renderWeek();
        renderDay();
      });
    });
  }

  // ============================================
  // LISTENERS — DAY VIEW
  // ============================================
  function attachDayListeners() {
    dayShifts.querySelectorAll('.shift-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (card.classList.contains('dragging')) return;
        const id = card.dataset.id;
        const shift = shifts.find(s => s.id === id);
        if (shift) openDetailModal(shift);
      });
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.classList.add('dragging'), 0);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dayShifts.querySelectorAll('.day-shift-col').forEach(c => c.classList.remove('drag-over'));
      });
    });

    dayShifts.querySelectorAll('.day-shift-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openShiftModal({ date: btn.dataset.date, shift: btn.dataset.shift });
      });
    });

    dayShifts.querySelectorAll('.day-shift-col').forEach(col => {
      const targetDate = col.dataset.dropDate;
      const targetShift = col.dataset.dropShift;
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
        const shift = shifts.find(s => s.id === id);
        if (!shift) return;
        if (shift.date === targetDate && shift.shift === targetShift) return;
        shift.date = targetDate;
        shift.shift = targetShift;
        saveShifts(shifts);
        showToast('Shift reassigned', 'success');
        updateSummary();
        renderWeek();
        renderDay();
      });
    });
  }

  // ============================================
  // SHIFT MODAL
  // ============================================
  function openShiftModal(preset) {
    populateEmployeeDropdown();
    const editing = preset && preset.id;
    shiftModalTitle.textContent = editing ? 'Edit Shift' : 'Assign Shift';

    if (editing) {
      const s = shifts.find(x => x.id === preset.id);
      if (s) {
        shiftId.value = s.id;
        shiftName.value = s.name;
        shiftDate.value = s.date;
        shiftType.value = s.shift;
        shiftRole.value = s.role || '';
        shiftPhone.value = s.phone || '';
        shiftNotes.value = s.notes || '';
      }
    } else {
      shiftForm.reset();
      shiftId.value = '';
      shiftDate.value = (preset && preset.date) || todayISO();
      shiftType.value = (preset && preset.shift) || 'afternoon';
    }

    shiftModal.classList.add('open');
    setTimeout(() => shiftName.focus(), 100);
  }
  function closeShiftModal() { shiftModal.classList.remove('open'); }

  shiftForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = shiftName.value.trim();
    const date = shiftDate.value;
    if (!name || !date) return;

    const data = {
      name,
      date,
      shift: shiftType.value,
      role: shiftRole.value.trim(),
      phone: shiftPhone.value.trim(),
      notes: shiftNotes.value.trim(),
    };

    if (shiftId.value) {
      const idx = shifts.findIndex(s => s.id === shiftId.value);
      if (idx > -1) {
        shifts[idx] = { ...shifts[idx], ...data };
        showToast('Shift updated', 'success');
      }
    } else {
      shifts.push({
        id: 's' + Date.now() + Math.random().toString(36).slice(2, 6),
        ...data,
      });
      showToast('Shift assigned', 'success');
    }

    saveShifts(shifts);
    closeShiftModal();
    updateSummary();
    renderWeek();
    renderDay();
  });

  // ============================================
  // DETAIL MODAL
  // ============================================
  function openDetailModal(shift) {
    detailShiftId = shift.id;
    detailTitle.textContent = shift.name;
    const t = SHIFT_TYPES[shift.shift] || SHIFT_TYPES.morning;
    const d = new Date(shift.date + 'T00:00:00');

    detailBody.innerHTML = `
      <div class="detail-row">
        <span class="label"><i class="fas fa-clock"></i> Shift</span>
        <span class="value">${t.label} · ${t.time}</span>
      </div>
      <div class="detail-row">
        <span class="label"><i class="fas fa-calendar"></i> Date</span>
        <span class="value">${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      ${shift.role ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-briefcase"></i> Role</span>
          <span class="value">${escapeHtml(shift.role)}</span>
        </div>` : ''}
      ${shift.phone ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-phone"></i> Phone</span>
          <span class="value">${escapeHtml(shift.phone)}</span>
        </div>` : ''}
      ${shift.notes ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-sticky-note"></i> Notes</span>
          <span class="value">${escapeHtml(shift.notes)}</span>
        </div>` : ''}
    `;

    detailModal.classList.add('open');
  }
  function closeDetailModal() { detailModal.classList.remove('open'); detailShiftId = null; }

  detailClose.addEventListener('click', closeDetailModal);
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

  detailEdit.addEventListener('click', () => {
    if (!detailShiftId) return;
    const s = shifts.find(x => x.id === detailShiftId);
    closeDetailModal();
    if (s) openShiftModal({ id: s.id });
  });

  detailDelete.addEventListener('click', () => {
    if (!detailShiftId) return;
    const s = shifts.find(x => x.id === detailShiftId);
    closeDetailModal();
    if (s) openDeleteModal(s);
  });

  // ============================================
  // DELETE
  // ============================================
  function openDeleteModal(shift) {
    pendingDeleteId = shift.id;
    deleteName.textContent = `${shift.name} on ${shift.date}`;
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
    shifts = shifts.filter(s => s.id !== pendingDeleteId);
    saveShifts(shifts);
    closeDeleteModal();
    showToast('Shift removed', 'success');
    updateSummary();
    renderWeek();
    renderDay();
  });

  // ============================================
  // VIEW SWITCHER
  // ============================================
  function switchView(view) {
    state.view = view;
    viewSwitch.querySelectorAll('.view-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
    weekView.classList.toggle('active', view === 'week');
    dayView.classList.toggle('active', view === 'day');
    if (view === 'week') renderWeek();
    else renderDay();
  }
  viewSwitch.querySelectorAll('.view-btn').forEach(b => {
    b.addEventListener('click', () => switchView(b.dataset.view));
  });

  // ============================================
  // NAVIGATION
  // ============================================
  prevWeek.addEventListener('click', () => {
    state.weekStart.setDate(state.weekStart.getDate() - 7);
    renderWeek();
  });
  nextWeek.addEventListener('click', () => {
    state.weekStart.setDate(state.weekStart.getDate() + 7);
    renderWeek();
  });
  goToday.addEventListener('click', () => {
    state.weekStart = startOfWeek(new Date());
    state.currentDay = new Date();
    renderWeek();
    renderDay();
  });

  prevDay.addEventListener('click', () => {
    state.currentDay.setDate(state.currentDay.getDate() - 1);
    renderDay();
  });
  nextDay.addEventListener('click', () => {
    state.currentDay.setDate(state.currentDay.getDate() + 1);
    renderDay();
  });

  // ============================================
  // EVENT BINDINGS
  // ============================================
  addShiftBtn.addEventListener('click', () => openShiftModal());
  shiftModalClose.addEventListener('click', closeShiftModal);
  shiftModalCancel.addEventListener('click', closeShiftModal);
  shiftModal.addEventListener('click', (e) => { if (e.target === shiftModal) closeShiftModal(); });

  // Summary chips
  document.querySelectorAll('.summary-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.summary-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.summaryFilter = chip.dataset.filter;
      renderWeek();
      renderDay();
    });
  });

  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeShiftModal();
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
  updateSummary();
  renderWeek();
  renderDay();
})();