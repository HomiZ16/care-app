(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================
    // 1. GET THE LOGGED IN USER
  const session = JSON.parse(localStorage.getItem('care_current_user'));
  const userSuffix = session ? '_' + session.email : '';

  // 2. APPEND SUFFIX TO ALL KEYS
  const EQUIP_KEY = 'care_equipment' + userSuffix;
  const SCHEDULE_KEY = 'care_schedule' + userSuffix;
  const BRAINSTORM_KEY = 'care_brainstorm' + userSuffix;
  const SHIFTS_KEY = 'care_shifts' + userSuffix;
  const THEME_KEY = 'care_theme';

  // ---- Theme sync ----
  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // ============================================
  // SHARED HELPERS
  // ============================================
  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  function animateNumber(el, target, duration = 600) {
    if (!el) return;
    const start = parseInt(el.textContent, 10) || 0;
    if (start === target) { el.textContent = target; return; }
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ============================================
  // EQUIPMENT HELPERS
  // ============================================
  const EQUIP_ICONS = {
    Oven: 'fa-oven', Freezer: 'fa-snowflake', Mixer: 'fa-blender',
    Fryer: 'fa-fire', Other: 'fa-cog',
  };

  function getEquipStatus(item) {
    if (!item.next) return 'none';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next = new Date(item.next + 'T00:00:00');
    if (isNaN(next.getTime())) return 'none';
    const diff = Math.round((next - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'due';
    if (diff <= 7) return 'warn';
    return 'ok';
  }
  function equipStatusLabel(s) {
    return { ok: 'OK', warn: 'Due Soon', due: 'Overdue', none: '—' }[s];
  }
  function equipStatusClass(s) {
    return { ok: 'status-ok', warn: 'status-warn', due: 'status-due', none: 'status-warn' }[s];
  }
  function equipRowSubtitle(item) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (item.next) {
      const next = new Date(item.next + 'T00:00:00');
      if (!isNaN(next.getTime())) {
        const diff = Math.round((next - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`;
        if (diff === 0) return 'Service due today';
        if (diff <= 7) return `Next service: in ${diff} day${diff === 1 ? '' : 's'}`;
      }
    }
    if (item.last) {
      const last = new Date(item.last + 'T00:00:00');
      if (!isNaN(last.getTime())) {
        const diff = Math.round((today - last) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Last serviced today';
        if (diff === 1) return 'Last serviced yesterday';
        if (diff > 0) return `Last serviced ${diff} days ago`;
      }
    }
    return 'No service history';
  }

  // ============================================
  // RENDER — STATS
  // ============================================
  function renderStats(equipment) {
    let ok = 0, warn = 0, due = 0;
    equipment.forEach(e => {
      const s = getEquipStatus(e);
      if (s === 'ok') ok++;
      else if (s === 'warn') warn++;
      else if (s === 'due') due++;
    });
    animateNumber(document.getElementById('statTotal'), equipment.length);
    animateNumber(document.getElementById('statOk'), ok);
    animateNumber(document.getElementById('statWarn'), warn);
    animateNumber(document.getElementById('statDue'), due);
  }

  // ============================================
  // RENDER — EQUIPMENT LIST
  // ============================================
  function renderEquipmentList() {
    const listEl = document.getElementById('equipList');
    if (!listEl) return;
    const equipment = loadJSON(EQUIP_KEY);

    if (equipment.length === 0) {
      listEl.innerHTML = `
        <div class="equip-empty">
          <i class="fas fa-box-open"></i>
          <p>No equipment yet. <a href="equipment.html?action=add">Add your first one</a>.</p>
        </div>
      `;
      renderStats(equipment);
      return;
    }

    // Sort by urgency: due → warn → none → ok, then by next date
    const rank = { due: 0, warn: 1, none: 2, ok: 3 };
    const sorted = equipment.slice().sort((a, b) => {
      const sa = rank[getEquipStatus(a)];
      const sb = rank[getEquipStatus(b)];
      if (sa !== sb) return sa - sb;
      return (a.next || '9999-99-99').localeCompare(b.next || '9999-99-99');
    });
    const top = sorted.slice(0, 4);

    listEl.innerHTML = top.map((item, i) => {
      const status = getEquipStatus(item);
      const icon = EQUIP_ICONS[item.type] || 'fa-cog';
      return `
        <div class="equip-row" style="animation-delay:${i * 0.06}s;cursor:pointer;" data-id="${escapeHtml(item.id)}">
          <div class="equip-icon"><i class="fas ${icon}"></i></div>
          <div class="equip-info">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(equipRowSubtitle(item))}</span>
          </div>
          <span class="equip-status ${equipStatusClass(status)}">${equipStatusLabel(status)}</span>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.equip-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.href = 'equipment.html';
      });
    });

    renderStats(equipment);
    renderNotifications(equipment);
  }

  // ============================================
  // RENDER — NOTIFICATIONS BADGE
  // ============================================
    function renderNotifications(equipment) {
    const badge = document.getElementById('notifBadge');
    const listEl = document.getElementById('notifList');
    if (!badge || !listEl) return;

    const tasks = loadJSON(SCHEDULE_KEY);
    const today = todayISO();
    let alerts = [];

    // 1. Check Equipment
    equipment.forEach(e => {
      const s = getEquipStatus(e);
      if (s === 'due') {
        alerts.push({ type: 'danger', title: e.name, desc: 'Maintenance is overdue!' });
      } else if (s === 'warn') {
        alerts.push({ type: 'warning', title: e.name, desc: 'Maintenance due soon.' });
      }
    });

    // 2. Check Tasks
    tasks.forEach(t => {
      if (!t.done && t.date <= today) {
        const isOverdue = t.date < today;
        alerts.push({ 
          type: isOverdue ? 'danger' : 'warning', 
          title: t.title, 
          desc: isOverdue ? 'Task is overdue.' : 'Task is due today.' 
        });
      }
    });

    // Update Badge
    badge.textContent = alerts.length;
    badge.style.display = alerts.length > 0 ? '' : 'none';

    // Build Dropdown HTML
    if (alerts.length === 0) {
      listEl.innerHTML = `<div class="notif-empty">You're all caught up! 🎉</div>`;
    } else {
      listEl.innerHTML = alerts.map(a => `
        <div class="notif-item ${a.type === 'danger' ? 'danger' : ''}">
          <i class="fas ${a.type === 'danger' ? 'fa-exclamation-circle' : 'fa-clock'}"></i>
          <div class="notif-item-content">
            <strong>${escapeHtml(a.title)}</strong>
            <span>${escapeHtml(a.desc)}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Toggle Dropdown Logic (Add this near your event listeners)
  const notifBtn = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
    });
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notifDropdown.classList.remove('open');
      }
    });
  }

  // ============================================
  // RENDER — SCHEDULE (Upcoming)
  // ============================================
  function renderSchedule() {
    const listEl = document.getElementById('scheduleList');
    if (!listEl) return;
    const tasks = loadJSON(SCHEDULE_KEY);
    const today = todayISO();

    // Upcoming undone tasks
    let upcoming = tasks
      .filter(t => !t.done && t.date >= today)
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return (a.time || '').localeCompare(b.time || '');
      })
      .slice(0, 3);

    // Fallback to overdue
    if (upcoming.length === 0) {
      upcoming = tasks
        .filter(t => !t.done && t.date < today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);
    }

    if (upcoming.length === 0) {
      listEl.innerHTML = `
        <div class="equip-empty">
          <i class="fas fa-calendar-check"></i>
          <p>All clear! <a href="schedule.html">Schedule a task</a>.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = upcoming.map((t, i) => {
      const d = new Date(t.date + 'T00:00:00');
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const overdue = t.date < today;
      return `
        <div class="schedule-item" style="animation-delay:${i * 0.06}s;cursor:pointer;" data-task-id="${escapeHtml(t.id)}">
          <div class="schedule-date" ${overdue ? 'style="border-color:var(--danger);"' : ''}>
            <div class="day" ${overdue ? 'style="color:var(--danger)"' : ''}>${day}</div>
            <div class="month">${month}</div>
          </div>
          <div class="schedule-info">
            <strong>${escapeHtml(t.title)}</strong>
            <span><i class="fas fa-clock"></i> ${t.time ? fmtTime(t.time) : 'All day'}${t.assignee ? ' · ' + escapeHtml(t.assignee) : ''}${overdue ? ' · <span style="color:var(--danger);font-weight:700">Overdue</span>' : ''}</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.schedule-item').forEach(el => {
      el.addEventListener('click', () => {
        window.location.href = 'schedule.html';
      });
    });
  }

  // ============================================
  // RENDER — TODAY'S SHIFTS
  // ============================================
  function renderShifts() {
    const board = document.getElementById('shiftBoard');
    if (!board) return;
    const shifts = loadJSON(SHIFTS_KEY);
    const today = todayISO();
    const todayShifts = shifts.filter(s => s.date === today);

    const types = {
      morning:   { label: 'Morning',   dotClass: 'dot-morning' },
      afternoon: { label: 'Afternoon', dotClass: 'dot-afternoon' },
      night:     { label: 'Night',     dotClass: 'dot-night' },
    };

    board.innerHTML = Object.keys(types).map(key => {
      const t = types[key];
      const items = todayShifts.filter(s => s.shift === key);

      const people = items.map(s => `
        <div class="shift-person">
          <div class="shift-avatar">${escapeHtml(getInitials(s.name))}</div>
          <span>${escapeHtml(s.name)}</span>
        </div>
      `).join('');

      const empty = items.length === 0
        ? `<div class="empty-shift">+ Add person</div>`
        : '';

      return `
        <div class="shift-col">
          <h4><span class="dot ${t.dotClass}"></span> ${t.label}</h4>
          ${people}
          ${empty}
        </div>
      `;
    }).join('');

    // Clicking any shift column goes to shifts page
    board.querySelectorAll('.shift-col').forEach(col => {
      col.addEventListener('click', () => {
        window.location.href = 'shifts.html';
      });
    });
  }

  // ============================================
  // RENDER — BRAINSTORM TABLE
  // ============================================
  function renderBrainstorm() {
    const tbody = document.getElementById('brainstormBody');
    if (!tbody) return;
    const ideas = loadJSON(BRAINSTORM_KEY);

    if (ideas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted);font-style:italic;">
            No ideas yet. <a href="brainstorm.html" style="color:var(--primary-light);font-weight:600;text-decoration:none;">Add your first idea</a>.
          </td>
        </tr>
      `;
      return;
    }

    // Sort: in-progress first, then backlog, then done; then by priority
    const statusRank = { inprogress: 0, backlog: 1, done: 2 };
    const priRank = { high: 0, medium: 1, low: 2 };
    const sorted = ideas.slice().sort((a, b) => {
      const s = statusRank[a.status] - statusRank[b.status];
      if (s !== 0) return s;
      return priRank[a.priority] - priRank[b.priority];
    }).slice(0, 5);

    tbody.innerHTML = sorted.map(i => {
      const priorityCls = i.priority === 'high' ? 'p-high' : i.priority === 'medium' ? 'p-med' : 'p-low';
      const statusLabel = i.status === 'inprogress' ? 'In Progress' : i.status.charAt(0).toUpperCase() + i.status.slice(1);
      const assignee = i.assignee
        ? `<span class="assignee"><span class="mini-avatar">${escapeHtml(getInitials(i.assignee))}</span> ${escapeHtml(i.assignee.split(' ')[0])}</span>`
        : `<span style="color:var(--text-muted);font-style:italic;">Unassigned</span>`;
      return `
        <tr>
          <td>${escapeHtml(i.title)}</td>
          <td><span class="priority-pill ${priorityCls}">${i.priority.charAt(0).toUpperCase() + i.priority.slice(1)}</span></td>
          <td>${assignee}</td>
          <td>${statusLabel}</td>
        </tr>
      `;
    }).join('');
  }

  // ============================================
  // RENDER ALL
  // ============================================
  function renderAll() {
    renderEquipmentList();
    renderSchedule();
    renderShifts();
    renderBrainstorm();
  }

  // ============================================
  // USER + TOPBAR
  // ============================================
  if (session) {
    try {
      const u = JSON.parse(session);
      document.getElementById('welcomeName').textContent = u.name.split(' ')[0];
    } catch (e) {}
  }

  // ============================================
  // SEARCH (filter equipment rows)
  // ============================================
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.equip-row').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  // ============================================
  // ADD EQUIPMENT → redirect with auto-open
  // ============================================
  document.getElementById('addEquipmentBtn').addEventListener('click', () => {
    window.location.href = 'equipment.html?action=add';
  });

  // ============================================
  // QUICK ACTIONS
  // ============================================
  document.querySelectorAll('.quick-action').forEach(qa => {
    qa.addEventListener('click', () => {
      const action = qa.dataset.action;
      const map = {
        'add-equipment': 'equipment.html?action=add',
        'schedule':      'schedule.html',
        'brainstorm':    'brainstorm.html',
        'shift':         'shifts.html',
      };
      if (map[action]) window.location.href = map[action];
    });
  });

  // ============================================
  // INIT + SYNC
  // ============================================
  renderAll();

  // Re-sync when tab regains focus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderAll();
  });

  // Cross-tab sync (fires when another tab writes to localStorage)
  window.addEventListener('storage', (e) => {
    if (e.key === EQUIP_KEY || e.key === SCHEDULE_KEY ||
        e.key === BRAINSTORM_KEY || e.key === SHIFTS_KEY) {
      renderAll();
    }
  });

  // Keyboard: Escape closes nothing here, but kept for consistency
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // no-op, but ready for future modals
    }
  });
})();