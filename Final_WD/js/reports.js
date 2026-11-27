(function () {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================
  const EQUIP_KEY = 'care_equipment';
  const SCHEDULE_KEY = 'care_schedule';
  const BRAINSTORM_KEY = 'care_brainstorm';
  const SHIFTS_KEY = 'care_shifts';
  const THEME_KEY = 'care_theme';

  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // ---- Loaders ----
  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }

  const allEquipment = loadJSON(EQUIP_KEY);
  const allTasks = loadJSON(SCHEDULE_KEY);
  const allIdeas = loadJSON(BRAINSTORM_KEY);
  const allShifts = loadJSON(SHIFTS_KEY);

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
  function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
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
  function isTaskOverdue(t) {
    if (t.done) return false;
    return t.date < todayISO();
  }

  // ============================================
  // RANGE FILTER
  // ============================================
  const rangeSelect = document.getElementById('rangeSelect');
  let rangeDays = 30;

  function withinRange(isoDate) {
    if (rangeDays === null) return true; // all time
    if (!isoDate) return false;
    const cutoff = daysAgoISO(rangeDays);
    return isoDate >= cutoff;
  }

  // ============================================
  // KPI COMPUTATION
  // ============================================
  function computeKPIs() {
    // ---- Equipment ----
    const equipTotal = allEquipment.length;
    let equipOk = 0, equipWarn = 0, equipDue = 0, equipNone = 0;
    allEquipment.forEach(e => {
      const s = getEquipStatus(e);
      if (s === 'ok') equipOk++;
      else if (s === 'warn') equipWarn++;
      else if (s === 'due') equipDue++;
      else equipNone++;
    });
    const uptime = equipTotal > 0 ? Math.round((equipOk / equipTotal) * 100) : 0;

    // ---- Tasks (within range) ----
    const tasksInRange = allTasks.filter(t => withinRange(t.date));
    const tasksTotal = tasksInRange.length;
    const tasksDone = tasksInRange.filter(t => t.done).length;
    const tasksOverdue = tasksInRange.filter(t => isTaskOverdue(t)).length;
    const tasksPending = tasksTotal - tasksDone - tasksOverdue;
    const completionPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

    // ---- Shifts (within range) ----
    const shiftsInRange = allShifts.filter(s => withinRange(s.date));
    const shiftsTotal = shiftsInRange.length;

    return {
      equipTotal, equipOk, equipWarn, equipDue, equipNone, uptime,
      tasksTotal, tasksDone, tasksPending, tasksOverdue, completionPct,
      shiftsTotal,
      tasksInRange, shiftsInRange,
    };
  }

  // ============================================
  // ANIMATED NUMBER
  // ============================================
  function animateNumber(el, target, opts = {}) {
    if (!el) return;
    const { suffix = '', decimals = 0, duration = 700 } = opts;
    const start = parseFloat(el.textContent) || 0;
    if (start === target) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = start + (target - start) * eased;
      el.textContent = val.toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ============================================
  // KPI RENDER
  // ============================================
  function renderKPIs() {
    const k = computeKPIs();

    animateNumber(document.getElementById('kpiEquip'), k.equipTotal);

    // Uptime trend
    const uptimeTrend = document.getElementById('kpiUptimeTrend');
    uptimeTrend.className = 'kpi-trend ' + (k.uptime >= 70 ? 'up' : k.uptime >= 40 ? '' : 'down');
    uptimeTrend.textContent = k.uptime >= 70 ? '✓ Good' : k.uptime >= 40 ? 'Fair' : 'Low';

    const uptimeEl = document.getElementById('kpiUptime');
    const startPct = parseInt(uptimeEl.textContent) || 0;
    animateNumber(uptimeEl, k.uptime, { suffix: '%' });

    // Tasks trend
    const tasksTrend = document.getElementById('kpiTasksTrend');
    tasksTrend.className = 'kpi-trend ' + (k.completionPct >= 70 ? 'up' : k.completionPct >= 40 ? '' : 'down');
    tasksTrend.textContent = k.completionPct + '% rate';

    animateNumber(document.getElementById('kpiTasks'), k.tasksDone);

    // Shifts trend
    const shiftsTrend = document.getElementById('kpiShiftsTrend');
    shiftsTrend.className = 'kpi-trend up';
    shiftsTrend.textContent = k.shiftsTotal > 0 ? '✓ Scheduled' : '—';

    animateNumber(document.getElementById('kpiShifts'), k.shiftsTotal);

    // Subtitles
    document.getElementById('kpiEquipSub').textContent = `Across ${new Set(allEquipment.map(e => e.location).filter(Boolean)).size} location${new Set(allEquipment.map(e => e.location).filter(Boolean)).size === 1 ? '' : 's'}`;
    document.getElementById('kpiUptimeSub').textContent = `${k.equipOk} operational, ${k.equipDue} overdue`;
    document.getElementById('kpiTasksSub').textContent = `Out of ${k.tasksTotal} scheduled`;
    document.getElementById('kpiShiftsSub').textContent = 'This period';
  }

  // ============================================
  // DONUT CHART (Equipment Status)
  // ============================================
  function renderDonut() {
    const k = computeKPIs();
    const total = k.equipTotal || 1;

    // Single ring showing operational percentage
    const pct = k.equipTotal > 0 ? (k.equipOk / k.equipTotal) : 0;
    const circumference = 2 * Math.PI * 80; // 502.65
    const ring = document.getElementById('donutRing');
    const dashLength = circumference * pct;
    ring.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
    ring.setAttribute('stroke', 'var(--primary-light)');

    // color by health
    if (pct >= 0.7) ring.setAttribute('stroke', 'var(--success)');
    else if (pct >= 0.4) ring.setAttribute('stroke', 'var(--warning)');
    else ring.setAttribute('stroke', 'var(--danger)');

    animateNumber(document.getElementById('donutValue'), k.equipTotal);

    // Legend
    const legend = document.getElementById('donutLegend');
    const rows = [
      { label: 'Operational', value: k.equipOk, color: 'var(--success)' },
      { label: 'Due Soon', value: k.equipWarn, color: 'var(--warning)' },
      { label: 'Overdue', value: k.equipDue, color: 'var(--danger)' },
    ];
    if (k.equipNone > 0) rows.push({ label: 'No Schedule', value: k.equipNone, color: 'var(--text-muted)' });

    legend.innerHTML = rows.map(r => `
      <div class="legend-row">
        <span class="legend-dot" style="background:${r.color}"></span>
        <span class="legend-label">${r.label}</span>
        <span class="legend-value">${r.value}</span>
        <span class="legend-pct">${k.equipTotal > 0 ? Math.round((r.value / k.equipTotal) * 100) : 0}%</span>
      </div>
    `).join('');
  }

  // ============================================
  // BAR CHART (Task Completion)
  // ============================================
  function renderBarChart() {
    const k = computeKPIs();
    const bars = [
      { label: 'Completed', cls: 'bar-completed', value: k.tasksDone },
      { label: 'Pending',   cls: 'bar-pending',   value: k.tasksPending },
      { label: 'Overdue',   cls: 'bar-overdue',   value: k.tasksOverdue },
    ];
    const max = Math.max(1, ...bars.map(b => b.value));

    const chart = document.getElementById('barChart');
    chart.innerHTML = bars.map(b => {
      const pct = (b.value / max) * 85; // cap at 85% of container height for label room
      return `
        <div class="bar-item">
          <div class="bar-fill ${b.cls}" data-value="${b.value}" data-target-height="${pct}%"></div>
          <div class="bar-label">${b.label}</div>
        </div>
      `;
    }).join('');

    // Animate heights after a frame
    requestAnimationFrame(() => {
      chart.querySelectorAll('.bar-fill').forEach(el => {
        const h = el.dataset.targetHeight;
        el.style.height = h === '0%' ? '4px' : h;
      });
    });
  }

  // ============================================
  // PRIORITY BREAKDOWN
  // ============================================
  function renderPriorityBreakdown() {
    // Count priorities across tasks + ideas
    let high = 0, med = 0, low = 0;
    allTasks.filter(t => withinRange(t.date)).forEach(t => {
      if (t.priority === 'high') high++;
      else if (t.priority === 'medium') med++;
      else if (t.priority === 'low') low++;
    });
    allIdeas.forEach(i => {
      if (i.priority === 'high') high++;
      else if (i.priority === 'medium') med++;
      else if (i.priority === 'low') low++;
    });

    const total = Math.max(1, high + med + low);
    const rows = [
      { label: 'High', value: high, cls: 'p-high', fillCls: 'p-high' },
      { label: 'Medium', value: med, cls: 'p-med', fillCls: 'p-med' },
      { label: 'Low', value: low, cls: 'p-low', fillCls: 'p-low' },
    ];

    const el = document.getElementById('priorityBreakdown');
    el.innerHTML = rows.map(r => {
      const pct = Math.round((r.value / total) * 100);
      return `
        <div class="priority-row">
          <div class="priority-row-header">
            <div class="priority-row-label">
              <span class="pill ${r.cls}">${r.label}</span>
              <span>${r.value} item${r.value === 1 ? '' : 's'}</span>
            </div>
            <span class="priority-row-value">${pct}%</span>
          </div>
          <div class="priority-bar">
            <div class="priority-bar-fill ${r.fillCls}" data-width="${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');

    requestAnimationFrame(() => {
      el.querySelectorAll('.priority-bar-fill').forEach(b => {
        b.style.width = b.dataset.width;
      });
    });
  }

  // ============================================
  // SHIFT COVERAGE
  // ============================================
  function renderShiftCoverage() {
    const inRange = allShifts.filter(s => withinRange(s.date));
    const types = {
      morning:   { label: 'Morning',   icon: 'fa-sun',     cls: 'morning',   time: '6 AM – 2 PM' },
      afternoon: { label: 'Afternoon', icon: 'fa-cloud-sun', cls: 'afternoon', time: '2 PM – 10 PM' },
      night:     { label: 'Night',     icon: 'fa-moon',    cls: 'night',     time: '10 PM – 6 AM' },
    };

    const el = document.getElementById('shiftCoverage');
    el.innerHTML = Object.keys(types).map(key => {
      const t = types[key];
      const count = inRange.filter(s => s.shift === key).length;
      const people = new Set(inRange.filter(s => s.shift === key).map(s => s.name)).size;
      return `
        <div class="shift-coverage-row">
          <div class="shift-cov-icon ${t.cls}"><i class="fas ${t.icon}"></i></div>
          <div class="shift-cov-info">
            <strong>${t.label}</strong>
            <span>${t.time} · ${people} person${people === 1 ? '' : 's'}</span>
          </div>
          <div class="shift-cov-count">${count}</div>
        </div>
      `;
    }).join('');
  }

  // ============================================
  // LEADERBOARD
  // ============================================
  function renderLeaderboard() {
    // Aggregate by assignee name (case-insensitive)
    const map = {};

    function bump(name, key, amount = 1) {
      if (!name) return;
      const norm = name.trim().toLowerCase();
      if (!norm) return;
      if (!map[norm]) map[norm] = { name: name.trim(), tasks: 0, shifts: 0, ideas: 0 };
      map[norm][key] += amount;
    }

    allTasks.filter(t => withinRange(t.date)).forEach(t => {
      if (t.assignee) bump(t.assignee, 'tasks');
    });
    allShifts.filter(s => withinRange(s.date)).forEach(s => {
      if (s.name) bump(s.name, 'shifts');
    });
    allIdeas.forEach(i => {
      if (i.assignee) bump(i.assignee, 'ideas');
    });

    const entries = Object.values(map).map(e => ({
      ...e,
      score: e.tasks + e.shifts + e.ideas,
    })).sort((a, b) => b.score - a.score).slice(0, 5);

    const el = document.getElementById('leaderboard');
    if (entries.length === 0) {
      el.innerHTML = `<div class="leader-empty">No activity yet — assign tasks, shifts, or ideas to your team.</div>`;
      return;
    }

    el.innerHTML = entries.map((e, i) => {
      const rankClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
      return `
        <div class="leader-row ${rankClass}">
          <div class="leader-rank">${i + 1}</div>
          <div class="leader-avatar">${escapeHtml(getInitials(e.name))}</div>
          <div class="leader-name">
            <strong>${escapeHtml(e.name)}</strong>
            <span>${e.tasks} task${e.tasks === 1 ? '' : 's'} · ${e.shifts} shift${e.shifts === 1 ? '' : 's'}${e.ideas ? ` · ${e.ideas} idea${e.ideas === 1 ? '' : 's'}` : ''}</span>
          </div>
          <div class="leader-stats">
            <div class="leader-stat">
              <div class="stat-num">${e.tasks}</div>
              <div class="stat-lbl">Tasks</div>
            </div>
            <div class="leader-stat">
              <div class="stat-num">${e.shifts}</div>
              <div class="stat-lbl">Shifts</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============================================
  // RENDER ALL
  // ============================================
  function renderAll() {
    renderKPIs();
    renderDonut();
    renderBarChart();
    renderPriorityBreakdown();
    renderShiftCoverage();
    renderLeaderboard();
  }

  // ============================================
  // RANGE CHANGE
  // ============================================
  rangeSelect.addEventListener('change', () => {
    const val = rangeSelect.value;
    rangeDays = val === 'all' ? null : parseInt(val, 10);
    renderAll();
  });

  // ============================================
  // EXPORT
  // ============================================
  const exportBtn = document.getElementById('exportBtn');
  const toastEl = document.getElementById('toast');

  function showToast(msg) {
    toastEl.className = 'toast success';
    toastEl.innerHTML = `<i class="fas fa-check-circle"></i> ${escapeHtml(msg)}`;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  exportBtn.addEventListener('click', () => {
    const k = computeKPIs();

    // Build CSV
    const lines = [];
    lines.push('CARE Report');
    lines.push('Generated,' + new Date().toLocaleString());
    lines.push('Range,' + (rangeDays === null ? 'All time' : 'Last ' + rangeDays + ' days'));
    lines.push('');
    lines.push('=== KPIs ===');
    lines.push('Total Equipment,' + k.equipTotal);
    lines.push('Operational,' + k.equipOk);
    lines.push('Due Soon,' + k.equipWarn);
    lines.push('Overdue,' + k.equipDue);
    lines.push('Uptime %,' + k.uptime);
    lines.push('Tasks Total,' + k.tasksTotal);
    lines.push('Tasks Completed,' + k.tasksDone);
    lines.push('Tasks Pending,' + k.tasksPending);
    lines.push('Tasks Overdue,' + k.tasksOverdue);
    lines.push('Completion %,' + k.completionPct);
    lines.push('Shifts Covered,' + k.shiftsTotal);
    lines.push('');
    lines.push('=== Equipment ===');
    lines.push('Name,Type,Location,Next Service,Status');
    allEquipment.forEach(e => {
      lines.push([
        e.name, e.type, e.location || '', e.next || '', getEquipStatus(e)
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `care-report-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Report exported as CSV');
  });

  // ============================================
  // INIT
  // ============================================
  renderAll();
})();